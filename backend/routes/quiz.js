const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /quiz -> { questions: [...], meta: {topic, teacher, updatedAt} | null }
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, subject, question, opts_json, correct FROM quiz_questions').all();
  const questions = rows.map(r => ({
    id: r.id,
    subject: r.subject,
    q: r.question,
    opts: JSON.parse(r.opts_json),
    correct: r.correct
  }));
  const meta = db.prepare('SELECT topic, teacher, updatedAt FROM quiz_meta WHERE id = 1').get() || null;
  res.json({ questions, meta });
});

// POST /quiz/publish  { teacher, topic, questions: [{subject,q,opts,correct}, ...] }
// Replaces the whole published bank — simple model for a single active class.
router.post('/publish', (req, res) => {
  const { teacher, topic, questions } = req.body || {};
  const teacherUser = db.prepare('SELECT role FROM users WHERE username = ?').get(teacher);
  if (!teacherUser || teacherUser.role !== 'teacher') {
    return res.status(403).json({ error: 'Only teacher accounts can publish questions.' });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'No questions supplied.' });
  }

  const clearStmt = db.prepare('DELETE FROM quiz_questions');
  const insertStmt = db.prepare(
    'INSERT INTO quiz_questions (subject, question, opts_json, correct) VALUES (?, ?, ?, ?)'
  );
  const upsertMeta = db.prepare(`
    INSERT INTO quiz_meta (id, topic, teacher, updatedAt) VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET topic = excluded.topic, teacher = excluded.teacher, updatedAt = excluded.updatedAt
  `);

  const tx = db.transaction((qs) => {
    clearStmt.run();
    qs.forEach(q => insertStmt.run(q.subject, q.q, JSON.stringify(q.opts), q.correct));
    upsertMeta.run(topic || 'Uploaded Material', teacher, Date.now());
  });
  tx(questions);

  res.json({ success: true, count: questions.length });
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM quiz_questions').run();
  db.prepare('DELETE FROM quiz_meta WHERE id = 1').run();
  res.json({ success: true });
});

module.exports = router;
