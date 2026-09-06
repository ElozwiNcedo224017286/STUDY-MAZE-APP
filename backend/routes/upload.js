const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const unzipper = require('unzipper');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function extractPptxText(buffer) {
  const directory = await unzipper.Open.buffer(buffer);
  const slideFiles = directory.files
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f.path))
    .sort((a, b) => {
      const na = parseInt(a.path.match(/slide(\d+)\.xml/)[1], 10);
      const nb = parseInt(b.path.match(/slide(\d+)\.xml/)[1], 10);
      return na - nb;
    });
  let text = '';
  for (const file of slideFiles) {
    const xml = (await file.buffer()).toString('utf8');
    const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]);
    text += matches.join(' ') + '\n';
  }
  return text;
}

// POST /upload/generate  (multipart/form-data, field name: files, plus text field "topic")
router.post('/generate', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }
    let combinedText = '';
    for (const file of req.files) {
      const name = file.originalname.toLowerCase();
      try {
        if (name.endsWith('.pdf')) combinedText += '\n\n=== ' + file.originalname + ' ===\n' + await extractPdfText(file.buffer);
        else if (name.endsWith('.pptx')) combinedText += '\n\n=== ' + file.originalname + ' ===\n' + await extractPptxText(file.buffer);
        else if (name.endsWith('.txt')) combinedText += '\n\n=== ' + file.originalname + ' ===\n' + file.buffer.toString('utf8');
        else combinedText += '\n\n=== ' + file.originalname + ' (skipped: unsupported type) ===\n';
      } catch (e) {
        combinedText += `\n\n=== ${file.originalname} (failed to parse: ${e.message}) ===\n`;
      }
    }

    if (!combinedText.trim()) {
      return res.status(422).json({ error: 'Could not extract any text from the uploaded files.' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY — set it in backend/.env.' });
    }

    const trimmed = combinedText.slice(0, 8000);
    const prompt =
      'You are creating a multiple-choice quiz for students based on lesson slide content. ' +
      'Return ONLY a JSON array (no markdown fences, no preamble, no explanation) of 8 to 12 question objects. ' +
      'Each object must have exactly these fields: subject (a short 1-2 word topic label in capitals), ' +
      'q (the question text), opts (an array of exactly 4 answer strings), correct (the 0-based index of the correct option in opts). ' +
      'Base every question strictly on the content below.\n\nSLIDE CONTENT:\n' + trimmed;

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(502).json({ error: 'Question generation failed.', detail: data });
    }
    const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const cleaned = textBlocks.replace(/```json|```/g, '').trim();
    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: 'Could not parse generated questions.' });
    }
    questions = questions.filter(q => q && Array.isArray(q.opts) && q.opts.length === 4 && typeof q.correct === 'number' && q.q && q.subject);
    if (questions.length === 0) {
      return res.status(502).json({ error: 'No valid questions were generated — try different slides.' });
    }
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unexpected server error while generating questions.' });
  }
});

module.exports = router;
