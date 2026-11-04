const test = require('node:test');
const assert = require('node:assert/strict');
const loadModule = require('./load-module.cjs');
const { PDFDocument } = require('pdf-lib');
const { Packer } = require('docx');
const exportsApi = loadModule('src/services/revisionNotesExport.js', {
  'pdf-lib/dist/pdf-lib.esm.js': require('pdf-lib'),
});

test('the revision pack exports a readable multi-page PDF', async () => {
  const document = await exportsApi.createRevisionNotesPdf();
  const bytes = await document.save();
  const reopened = await PDFDocument.load(bytes);
  assert.ok(reopened.getPageCount() > 1);
  assert.ok(bytes.length > 1000);
});

test('the revision pack exports a Word document archive', async () => {
  const bytes = await Packer.toBuffer(exportsApi.createRevisionNotesDocx());
  assert.equal(bytes.subarray(0, 2).toString(), 'PK');
  assert.ok(bytes.length > 1000);
});
