import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const TABS = ['Create', 'Published', 'Notes', 'Class'];
const LETTERS = ['A', 'B', 'C', 'D'];
const EMPTY_Q = { subject: '', q: '', opts: ['', '', '', ''], correct: 0 };

// Shared editor for adding a new question or editing an existing one.
function QuestionEditor({ visible, initial, onSave, onClose }) {
  const [subject, setSubject] = useState('');
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (visible) {
      const base = initial || EMPTY_Q;
      setSubject(base.subject || '');
      setQ(base.q || '');
      setOpts([0, 1, 2, 3].map((i) => base.opts?.[i] || ''));
      setCorrect(typeof base.correct === 'number' ? base.correct : 0);
      setErr('');
    }
  }, [visible, initial]);

  function save() {
    if (!q.trim()) { setErr('Enter the question.'); return; }
    if (opts.some((o) => !o.trim())) { setErr('Fill in all four options.'); return; }
    onSave({ subject: subject.trim().toUpperCase() || 'QUIZ', q: q.trim(), opts: opts.map((o) => o.trim()), correct });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView>
            <Text style={styles.modalTitle}>{initial ? 'Edit Question' : 'New Question'}</Text>

            <Text style={styles.label}>Subject tag</Text>
            <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="e.g. SCIENCE" placeholderTextColor={colors.inkDim} autoCapitalize="characters" />

            <Text style={styles.label}>Question</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} value={q} onChangeText={setQ} placeholder="Type the question…" placeholderTextColor={colors.inkDim} multiline />

            <Text style={styles.label}>Options (tap the letter to mark the correct one)</Text>
            {opts.map((o, i) => (
              <View key={i} style={styles.optRow}>
                <TouchableOpacity style={[styles.optLetter, correct === i && styles.optLetterActive]} onPress={() => setCorrect(i)}>
                  <Text style={[styles.optLetterText, correct === i && styles.optLetterTextActive]}>{LETTERS[i]}</Text>
                </TouchableOpacity>
                <TextInput style={[styles.input, styles.optInput]} value={o} onChangeText={(t) => setOpts((prev) => prev.map((p, j) => (j === i ? t : p)))} placeholder={`Option ${LETTERS[i]}`} placeholderTextColor={colors.inkDim} />
              </View>
            ))}

            {!!err && <Text style={styles.err}>{err}</Text>}

            <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={onClose}><Text style={styles.btnGhostText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function TeacherDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('Create');

  async function handleLogout() {
    await logout();
    navigation.replace('Auth');
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Teacher · <Text style={styles.username}>{user?.username}</Text></Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}><Text style={styles.iconBtnText}>⏻</Text></TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Create' && <CreateTab user={user} navigation={navigation} />}
      {tab === 'Published' && <PublishedTab />}
      {tab === 'Notes' && <NotesTab />}
      {tab === 'Class' && <ClassTab />}
    </View>
  );
}

// ---------------------------------------------------------------- Create
function CreateTab({ user, navigation }) {
  const [files, setFiles] = useState([]);
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setFiles((prev) => [...prev, ...result.assets]);
  }

  async function generate() {
    if (files.length === 0) return;
    setBusy(true);
    setStatus('Generating questions from your slides…');
    try {
      const { questions } = await api.generateQuestions(files, topic || 'Uploaded Material');
      setDrafts((prev) => [...prev, ...questions]);
      setStatus(`Generated ${questions.length} questions. Review below, then publish.`);
    } catch (e) {
      setStatus(e.message || "Couldn't generate questions — please try again.");
    }
    setBusy(false);
  }

  function openNew() { setEditIndex(null); setEditorVisible(true); }
  function openEdit(i) { setEditIndex(i); setEditorVisible(true); }
  function saveEditor(q) {
    setDrafts((prev) => (editIndex == null ? [...prev, q] : prev.map((d, i) => (i === editIndex ? q : d))));
    setEditorVisible(false);
  }
  function removeDraft(i) { setDrafts((prev) => prev.filter((_, j) => j !== i)); }

  async function publish() {
    if (drafts.length === 0) return;
    try {
      await api.publishQuizBank(user.username, topic || 'Uploaded Material', drafts);
      setStatus(`Published ${drafts.length} questions to all students! 🎉`);
      setDrafts([]);
      setFiles([]);
    } catch (e) {
      setStatus(e.message || 'Could not publish — please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.sectionTitle}>Build a Quiz</Text>
      <Text style={styles.sub}>Generate questions from slides with AI, add your own by hand, or both — then publish the set to your students.</Text>

      <Text style={styles.label}>Topic / class name</Text>
      <TextInput style={styles.input} value={topic} onChangeText={setTopic} placeholder="e.g. Grade 10 Life Sciences — Cell Structure" placeholderTextColor={colors.inkDim} />

      <View style={styles.uploadZone}>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickFiles}><Text style={styles.uploadBtnText}>Choose Files (PDF / TXT)</Text></TouchableOpacity>
        <Text style={styles.uploadHint}>Export PowerPoint to PDF first</Text>
      </View>
      {files.map((f, i) => (
        <View key={i} style={styles.row}><Text style={styles.rowText} numberOfLines={1}>{f.name}</Text><Text>✅</Text></View>
      ))}

      <TouchableOpacity style={[styles.btnSecondary, (busy || files.length === 0) && styles.btnDisabled]} disabled={busy || files.length === 0} onPress={generate}>
        <Text style={styles.btnSecondaryText}>{busy ? 'Generating…' : '✨ Generate from Slides'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnGhost} onPress={openNew}><Text style={styles.btnGhostText}>✍️ Add a Question Manually</Text></TouchableOpacity>

      {!!status && <Text style={styles.status}>{status}</Text>}

      {drafts.length > 0 && <Text style={styles.sectionTitle}>Review ({drafts.length})</Text>}
      {drafts.map((q, idx) => (
        <View key={idx} style={styles.genCard}>
          <View style={styles.genActions}>
            <TouchableOpacity onPress={() => openEdit(idx)}><Text style={styles.editBtn}>✎</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => removeDraft(idx)}><Text style={styles.removeBtn}>×</Text></TouchableOpacity>
          </View>
          <Text style={styles.genTag}>{q.subject}</Text>
          <Text style={styles.genQ}>{q.q}</Text>
          {q.opts.map((o, i) => (
            <Text key={i} style={[styles.genOpt, i === q.correct && styles.genOptCorrect]}>{i === q.correct ? '✔' : '·'} {o}</Text>
          ))}
        </View>
      ))}

      {drafts.length > 0 && (
        <TouchableOpacity style={styles.btn} onPress={publish}><Text style={styles.btnText}>Publish to Students</Text></TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Main')}><Text style={styles.btnGhostText}>🎮 Preview Student App</Text></TouchableOpacity>

      <QuestionEditor visible={editorVisible} initial={editIndex == null ? null : drafts[editIndex]} onSave={saveEditor} onClose={() => setEditorVisible(false)} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------- Published
function PublishedTab() {
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTest(await api.getMyLatestTest()); } catch (e) { setStatus(e.message); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveQuestions(questions) {
    await api.updateTestQuestions(test.id, questions);
    setTest({ ...test, questions });
  }
  async function removeQuestion(i) {
    const next = test.questions.filter((_, j) => j !== i);
    try { await saveQuestions(next); } catch (e) { setStatus(e.message); }
  }
  async function saveEditor(q) {
    const next = test.questions.map((d, i) => (i === editIndex ? q : d));
    try { await saveQuestions(next); setEditorVisible(false); } catch (e) { setStatus(e.message); }
  }
  async function clearAll() {
    try { await api.clearQuizBank(); setTest(null); setStatus('Published quiz cleared.'); } catch (e) { setStatus(e.message); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.mint} /></View>;

  if (!test || test.questions.length === 0) {
    return (
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Published Quiz</Text>
        <Text style={styles.empty}>You haven't published a quiz yet. Build one in the Create tab.</Text>
        {!!status && <Text style={styles.status}>{status}</Text>}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.sectionTitle}>Live: {test.topic}</Text>
      <Text style={styles.sub}>{test.questions.length} question{test.questions.length === 1 ? '' : 's'} students are playing right now.</Text>
      {!!status && <Text style={styles.status}>{status}</Text>}

      {test.questions.map((q, idx) => (
        <View key={idx} style={styles.genCard}>
          <View style={styles.genActions}>
            <TouchableOpacity onPress={() => { setEditIndex(idx); setEditorVisible(true); }}><Text style={styles.editBtn}>✎</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => removeQuestion(idx)}><Text style={styles.removeBtn}>×</Text></TouchableOpacity>
          </View>
          <Text style={styles.genTag}>{q.subject}</Text>
          <Text style={styles.genQ}>{q.q}</Text>
          {q.opts.map((o, i) => (
            <Text key={i} style={[styles.genOpt, i === q.correct && styles.genOptCorrect]}>{i === q.correct ? '✔' : '·'} {o}</Text>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.btnGhost} onPress={clearAll}><Text style={styles.btnGhostText}>Clear Published Quiz</Text></TouchableOpacity>

      <QuestionEditor visible={editorVisible} initial={editIndex == null ? null : test.questions[editIndex]} onSave={saveEditor} onClose={() => setEditorVisible(false)} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------- Notes
function NotesTab() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { materials } = await api.getStudyMaterials(); setMaterials(materials); } catch (e) { setStatus(e.message); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function post() {
    if (!title.trim() || !content.trim()) { setStatus('Add a title and some content.'); return; }
    setBusy(true);
    try {
      await api.createStudyMaterial({ title: title.trim(), subject: subject.trim(), grade: grade.trim(), content: content.trim() });
      setTitle(''); setSubject(''); setGrade(''); setContent(''); setStatus('Note posted to students. 📚');
      await load();
    } catch (e) { setStatus(e.message); }
    setBusy(false);
  }

  async function remove(id) {
    try { await api.deleteStudyMaterial(id); await load(); } catch (e) { setStatus(e.message); }
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.sectionTitle}>Post Study Notes</Text>
      <Text style={styles.sub}>Share summaries and notes your students can read in the app.</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Cell Structure" placeholderTextColor={colors.inkDim} />
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Text style={styles.label}>Subject</Text>
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Life Sciences" placeholderTextColor={colors.inkDim} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Grade</Text>
          <TextInput style={styles.input} value={grade} onChangeText={setGrade} placeholder="10" placeholderTextColor={colors.inkDim} />
        </View>
      </View>
      <Text style={styles.label}>Notes</Text>
      <TextInput style={[styles.input, styles.inputTall]} value={content} onChangeText={setContent} placeholder="Write the study notes…" placeholderTextColor={colors.inkDim} multiline />

      <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={post}><Text style={styles.btnText}>{busy ? 'Posting…' : 'Post to Students'}</Text></TouchableOpacity>
      {!!status && <Text style={styles.status}>{status}</Text>}

      <Text style={styles.sectionTitle}>Your Notes</Text>
      {loading ? <ActivityIndicator color={colors.mint} /> : materials.length === 0 ? (
        <Text style={styles.empty}>No notes yet.</Text>
      ) : materials.map((m) => (
        <View key={m.id} style={styles.noteCard}>
          <View style={styles.genActions}><TouchableOpacity onPress={() => remove(m.id)}><Text style={styles.removeBtn}>×</Text></TouchableOpacity></View>
          <Text style={styles.noteTitle}>{m.title}</Text>
          {(m.subject || m.grade) ? <Text style={styles.noteMeta}>{[m.subject, m.grade && `Grade ${m.grade}`].filter(Boolean).join(' · ')}</Text> : null}
          <Text style={styles.noteBody} numberOfLines={4}>{m.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- Class
function ClassTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { rows } = await api.getLeaderboard(50); setRows(rows); } catch (e) { setStatus(e.message); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.sectionTitle}>Class Standings</Text>
      <Text style={styles.sub}>Coins earned across all games — a quick read on who's engaging.</Text>
      {!!status && <Text style={styles.status}>{status}</Text>}

      {loading ? <ActivityIndicator color={colors.mint} /> : rows.length === 0 ? (
        <Text style={styles.empty}>No student activity yet. Once students play, they'll appear here.</Text>
      ) : rows.map((r, i) => (
        <View key={r.user_id} style={styles.lbRow}>
          <Text style={styles.lbRank}>{i + 1}</Text>
          <Text style={styles.lbName} numberOfLines={1}>{r.display_name || 'Player'}</Text>
          <Text style={styles.lbGames}>{r.games_played} games</Text>
          <Text style={styles.lbCoins}>🪙 {r.total_coins}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 },
  welcome: { color: colors.inkDim, fontSize: 13 },
  username: { color: colors.gold, fontWeight: '800' },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: colors.ink, fontSize: 14 },

  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, marginBottom: 6 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center' },
  tabActive: { backgroundColor: colors.wall, borderColor: colors.mint },
  tabText: { color: colors.inkDim, fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: colors.ink },

  body: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.gold, fontSize: 16, fontWeight: '800', marginBottom: 6, marginTop: 10 },
  sub: { color: colors.inkDim, fontSize: 12.5, lineHeight: 18, marginBottom: 12 },
  empty: { color: colors.inkDim, fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 19 },

  label: { color: colors.inkDim, fontSize: 11, marginBottom: 5, marginTop: 6 },
  input: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 9, padding: 12, color: colors.ink, fontSize: 13.5, marginBottom: 8 },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  inputTall: { minHeight: 120, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },

  uploadZone: { borderWidth: 2, borderColor: colors.wallEdge, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: colors.panel, marginBottom: 8, marginTop: 4 },
  uploadBtn: { backgroundColor: colors.teal, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  uploadBtnText: { color: '#062B1F', fontWeight: '700', fontSize: 12.5 },
  uploadHint: { color: colors.inkDim, fontSize: 10.5, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 9, padding: 10, marginBottom: 7 },
  rowText: { color: colors.ink, fontSize: 12, flex: 1, marginRight: 8 },

  btn: { backgroundColor: colors.mint, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 6 },
  btnText: { color: '#062B1F', fontWeight: '800', fontSize: 14.5 },
  btnSecondary: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnSecondaryText: { color: '#062B1F', fontWeight: '700', fontSize: 13 },
  btnGhost: { borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  btnGhostText: { color: colors.inkDim, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  status: { color: colors.mint, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  err: { color: colors.coral, fontSize: 12.5, marginBottom: 8 },

  genCard: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, padding: 14, marginBottom: 9, marginTop: 6 },
  genActions: { position: 'absolute', right: 8, top: 6, flexDirection: 'row', gap: 12, padding: 4, zIndex: 2 },
  editBtn: { color: colors.teal, fontSize: 16 },
  removeBtn: { color: colors.coral, fontSize: 18 },
  genTag: { color: colors.coral, fontSize: 9.5, letterSpacing: 0.5, marginBottom: 5, fontWeight: '800' },
  genQ: { color: colors.ink, fontSize: 13, marginBottom: 8, paddingRight: 40 },
  genOpt: { color: colors.inkDim, fontSize: 11.5, paddingVertical: 2 },
  genOptCorrect: { color: colors.mint, fontWeight: '700' },

  noteCard: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, padding: 14, marginBottom: 9, marginTop: 6 },
  noteTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', paddingRight: 30 },
  noteMeta: { color: colors.gold, fontSize: 10.5, marginTop: 3, fontWeight: '700' },
  noteBody: { color: colors.inkDim, fontSize: 12, marginTop: 6, lineHeight: 17 },

  lbRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, padding: 12, marginBottom: 8 },
  lbRank: { color: colors.gold, fontWeight: '900', fontSize: 14, width: 24 },
  lbName: { color: colors.ink, fontSize: 13, fontWeight: '600', flex: 1 },
  lbGames: { color: colors.inkDim, fontSize: 10.5, marginRight: 10 },
  lbCoins: { color: colors.gold, fontSize: 12, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,4,24,0.85)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.mint, borderRadius: 16, padding: 18, maxHeight: '88%' },
  modalTitle: { color: colors.gold, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  optLetter: { width: 38, height: 44, borderRadius: 9, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  optLetterActive: { backgroundColor: colors.mint, borderColor: colors.mint },
  optLetterText: { color: colors.inkDim, fontWeight: '800' },
  optLetterTextActive: { color: '#062B1F' },
  optInput: { flex: 1, marginBottom: 0 },
});
