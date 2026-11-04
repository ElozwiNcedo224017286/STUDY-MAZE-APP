// The bundled build avoids tslib's incompatible ESM entry in Metro.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib/dist/pdf-lib.esm.js';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { BUSINESS_CASE_NOTES, REVISION_PACK } from '../data/businessCaseRevisionNotes.js';

const FILE_STEM = 'Study-Maze-Business-Case-Revision-Notes';
const PURPLE = rgb(0.29, 0.11, 0.58);
const INK = rgb(0.10, 0.14, 0.20);
const MUTED = rgb(0.35, 0.42, 0.50);
const GREEN = rgb(0.06, 0.52, 0.38);
const GOLD = rgb(0.83, 0.58, 0.04);

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareBase64(base64, filename, mimeType, dialogTitle) {
  const FileSystem = require('expo-file-system/legacy');
  const Sharing = require('expo-sharing');
  if (!FileSystem.cacheDirectory) throw new Error('Document storage is unavailable on this device.');

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Document sharing is unavailable on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

function splitText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function diagramLabels(diagram) {
  if (!diagram) return [];
  if (diagram.steps) return diagram.steps;
  return (diagram.cells || []).map((cell) => `${cell.label}: ${cell.detail}`);
}

export async function createRevisionNotesPdf() {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [595.28, 841.89];
  const margin = 50;
  const contentWidth = pageSize[0] - margin * 2;
  let page;
  let y;

  function newPage() {
    page = pdf.addPage(pageSize);
    y = pageSize[1] - margin;
  }

  function ensureSpace(height) {
    if (y - height < 58) newPage();
  }

  function drawBlock(text, options = {}) {
    const size = options.size || 10;
    const lineHeight = options.lineHeight || size * 1.45;
    const font = options.bold ? bold : regular;
    const indent = options.indent || 0;
    const lines = splitText(text, font, size, contentWidth - indent);
    ensureSpace(lines.length * lineHeight + (options.after || 0));
    lines.forEach((line) => {
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color: options.color || INK,
      });
      y -= lineHeight;
    });
    y -= options.after || 0;
  }

  function drawFlow(diagram) {
    const labels = diagramLabels(diagram);
    drawBlock(diagram.title.toUpperCase(), { size: 8, bold: true, color: PURPLE, after: 5 });
    labels.forEach((label, index) => {
      const lines = splitText(label, bold, 9, contentWidth - 34);
      const boxHeight = Math.max(28, lines.length * 12 + 10);
      ensureSpace(boxHeight + (index < labels.length - 1 ? 18 : 8));
      page.drawRectangle({
        x: margin,
        y: y - boxHeight + 5,
        width: contentWidth,
        height: boxHeight,
        color: index % 2 ? rgb(0.94, 0.98, 0.96) : rgb(0.96, 0.94, 0.99),
        borderColor: index % 2 ? GREEN : PURPLE,
        borderWidth: 1,
      });
      lines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: margin + 12,
          y: y - 12 - lineIndex * 12,
          size: 9,
          font: bold,
          color: INK,
        });
      });
      y -= boxHeight;
      if (index < labels.length - 1) {
        page.drawLine({ start: { x: margin + 20, y }, end: { x: margin + 20, y: y - 10 }, thickness: 1.5, color: GOLD });
        page.drawText('v', { x: margin + 17, y: y - 16, size: 9, font: bold, color: GOLD });
        y -= 18;
      }
    });
    y -= 8;
  }

  newPage();
  drawBlock(REVISION_PACK.subject.toUpperCase(), { size: 9, bold: true, color: PURPLE, after: 8 });
  drawBlock(REVISION_PACK.title, { size: 24, lineHeight: 29, bold: true, color: INK, after: 8 });
  drawBlock(REVISION_PACK.description, { size: 11, lineHeight: 17, color: MUTED, after: 18 });
  page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 2, color: GOLD });
  y -= 24;

  BUSINESS_CASE_NOTES.forEach((note) => {
    ensureSpace(120);
    drawBlock(`${note.number}  ${note.title}`, { size: 16, lineHeight: 21, bold: true, color: PURPLE, after: 4 });
    drawBlock(note.summary, { size: 10.5, lineHeight: 15, bold: true, color: MUTED, after: 7 });
    note.paragraphs.forEach((paragraph) => drawBlock(paragraph, { size: 10, lineHeight: 14.5, after: 6 }));
    note.bullets.forEach((bullet) => drawBlock(`- ${bullet}`, { size: 9.5, lineHeight: 14, indent: 10, after: 2 }));
    y -= 4;
    drawBlock(`KEY POINT: ${note.keyPoint}`, { size: 9.5, lineHeight: 14, bold: true, color: GREEN, after: 9 });
    if (note.diagram) drawFlow(note.diagram);
    drawBlock(`QUICK CHECK: ${note.check.question}`, { size: 9.5, lineHeight: 14, bold: true, color: PURPLE, after: 3 });
    drawBlock(`Answer: ${note.check.answer}`, { size: 9, lineHeight: 13.5, color: MUTED, after: 18 });
  });

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawText(`Study Maze | ${REVISION_PACK.subject}`, { x: margin, y: 28, size: 8, font: regular, color: MUTED });
    item.drawText(`${index + 1} / ${pages.length}`, { x: pageSize[0] - margin - 28, y: 28, size: 8, font: regular, color: MUTED });
  });
  return pdf;
}

function labelledPanel(label, text, fill) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            borders: {
              top: { style: BorderStyle.SINGLE, color: fill, size: 1 },
              bottom: { style: BorderStyle.SINGLE, color: fill, size: 1 },
              left: { style: BorderStyle.SINGLE, color: fill, size: 1 },
              right: { style: BorderStyle.SINGLE, color: fill, size: 1 },
            },
            children: [
              new Paragraph({ children: [new TextRun({ text: label, bold: true, color: '4C1D95' })] }),
              new Paragraph({ text, spacing: { before: 80 } }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function createRevisionNotesDocx() {
  const children = [
    new Paragraph({
      text: REVISION_PACK.subject.toUpperCase(),
      style: 'Subtitle',
      spacing: { after: 180 },
    }),
    new Paragraph({
      text: REVISION_PACK.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
    }),
    new Paragraph({
      text: REVISION_PACK.description,
      spacing: { after: 360 },
    }),
  ];

  BUSINESS_CASE_NOTES.forEach((note) => {
    children.push(
      new Paragraph({
        text: `${note.number}  ${note.title}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: note.number !== '01',
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: note.summary, bold: true, color: '5A6B7F' })],
        spacing: { after: 180 },
      })
    );
    note.paragraphs.forEach((text) => children.push(new Paragraph({ text, spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED })));
    note.bullets.forEach((text) => children.push(new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } })));
    children.push(labelledPanel('KEY POINT', note.keyPoint, 'E8F7F1'));

    if (note.diagram) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: note.diagram.title.toUpperCase(), bold: true, color: '6D28D9' })],
          spacing: { before: 220, after: 100 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: diagramLabels(note.diagram).map((label, index) => new TableCell({
                shading: { fill: index % 2 ? 'ECFDF5' : 'F3E8FF', type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [new Paragraph({ text: label, alignment: AlignmentType.CENTER })],
              })),
            }),
          ],
        })
      );
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: `QUICK CHECK: ${note.check.question}`, bold: true, color: '4C1D95' })],
        spacing: { before: 220, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Answer: ${note.check.answer}`, italics: true, color: '5A6B7F' })],
        spacing: { after: 180 },
      })
    );
  });

  return new Document({
    creator: 'Study Maze',
    title: REVISION_PACK.title,
    description: REVISION_PACK.description,
    styles: {
      default: {
        document: { run: { font: 'Aptos', size: 22, color: '1A2332' }, paragraph: { spacing: { line: 276 } } },
        title: { run: { font: 'Aptos Display', size: 42, bold: true, color: '1A2332' } },
        heading1: { run: { font: 'Aptos Display', size: 30, bold: true, color: '6D28D9' } },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children,
    }],
  });
}

export async function exportRevisionNotes(format) {
  const isWeb = typeof document !== 'undefined' && typeof URL !== 'undefined';
  if (format === 'pdf') {
    const pdf = await createRevisionNotesPdf();
    const filename = `${FILE_STEM}.pdf`;
    if (isWeb) {
      const bytes = await pdf.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
    } else {
      await shareBase64(await pdf.saveAsBase64(), filename, 'application/pdf', 'Save revision notes PDF');
    }
    return;
  }

  if (format === 'docx') {
    const document = createRevisionNotesDocx();
    const filename = `${FILE_STEM}.docx`;
    const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isWeb) {
      downloadBlob(await Packer.toBlob(document), filename);
    } else {
      await shareBase64(await Packer.toBase64String(document), filename, mime, 'Save revision notes Word document');
    }
    return;
  }

  throw new Error('Unsupported revision notes format.');
}
