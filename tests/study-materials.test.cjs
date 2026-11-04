const test = require('node:test');
const assert = require('node:assert/strict');
const loadModule = require('./load-module.cjs');
const { normalizeStudyList } = loadModule('src/utils/studyLists.js');

test('material_id projections have stable identities and repeated rows appear once', () => {
  const rows = [{ material_id: 'material-1', title: 'Cells', content: 'Cell structures' }, { material_id: 'material-1', title: 'Cells', content: 'Cell structures' }];
  const result = normalizeStudyList(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'material-1');
  assert.ok(result[0].listKey);
  assert.equal(rows[0].id, undefined, 'Do not mutate API responses');
});

test('legacy notes without IDs have unique, reorder-stable keys', () => {
  const rows = [{ title: 'Cells', content: 'Cell structures' }, { title: 'Cells', content: 'Cell division' }];
  const first = normalizeStudyList(rows);
  const reversed = normalizeStudyList([...rows].reverse());
  assert.equal(new Set(first.map(row => row.listKey)).size, 2);
  assert.equal(first[0].listKey, reversed[1].listKey);
  assert.equal(first[1].listKey, reversed[0].listKey);
});

test('the real materials API normalizes its RPC response before screens render it', async () => {
  const supabase = { rpc: async (name, args) => {
    assert.equal(name, 'student_list_subject_materials');
    assert.equal(args._class_subject_id, 'biology');
    return { data: [{ material_id: 'one', title: 'Cells' }, { material_id: 'one', title: 'Cells' }], error: null };
  } };
  const { api } = loadModule('src/api/client.js', { './supabase': { supabase }, 'expo-file-system': { File: class {} } });
  const { materials } = await api.getSubjectMaterials('biology');
  assert.equal(materials.length, 1);
  assert.equal(materials[0].id, 'one');
  assert.equal(materials[0].listKey, 'material:biology:one');
});

test('personal notes deduplicate note IDs and keep the subject boundary', async () => {
  const row = { note_id: 'note-1', upload_id: 'upload-1', class_subject_id: 'biology', summary: 'Cells' };
  const { api } = loadModule('src/api/client.js', {
    './supabase': { supabase: { rpc: async () => ({ data: [row, row], error: null }) } },
    'expo-file-system': { File: class {} },
  });
  const notes = await api.getStudentStudyNotes('biology');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].id, 'note-1');
  await assert.rejects(api.getStudentStudyNotes('another-subject'), /subject-linked/);
});
