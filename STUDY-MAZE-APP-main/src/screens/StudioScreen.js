import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import QuestionEditor from '../components/QuestionEditor';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function StudioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [segment, setSegment] = useState('create');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
      <ScreenHeader
        title="Quiz"
        titleHighlight="Studio"
        subtitle="Generate from slides, edit by hand, then publish to every student game."
      />
      <View style={styles.segmentWrap}>
        {['create', 'live'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.segment, segment === key && styles.segmentActive]}
            onPress={() => setSegment(key)}
          >
            <Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>
              {key === 'create' ? 'Create' : 'Live quiz'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {segment === 'create'
        ? <CreatePane user={user} navigation={navigation} bottom={insets.bottom} />
        : <LivePane bottom={insets.bottom} />}
    </View>
  );
}

function CreatePane({ user, navigation, bottom }) {
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

  function saveEditor(q) {
    setDrafts((prev) => (editIndex == null ? [...prev, q] : prev.map((d, i) => (i === editIndex ? q : d))));
    setEditorVisible(false);
  }

  async function publish() {
    if (drafts.length === 0) return;
    try {
      await api.publishQuizBank(user.username, topic || 'Uploaded Material', drafts);
      setStatus(`Published ${drafts.length} questions to all students.`);
      setDrafts([]);
      setFiles([]);
    } catch (e) {
      setStatus(e.message || 'Could not publish — please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottom + 100 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.label}>Topic / class name</Text>
      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. Grade 10 Life Sciences — Cell Structure"
        placeholderTextColor={COLORS.textTertiary}
      />

      <TouchableOpacity style={styles.upload} onPress={pickFiles} activeOpacity={0.8}>
        <Ionicons name="cloud-upload-outline" size={22} color={COLORS.primary} />
        <Text style={styles.uploadTitle}>Choose files (PDF / TXT)</Text>
        <Text style={styles.uploadHint}>Export PowerPoint to PDF first</Text>
      </TouchableOpacity>
      {files.map((f, i) => (
        <View key={`${f.name}-${i}`} style={styles.fileRow}>
          <Ionicons name="document-outline" size={16} color={COLORS.primary} />
          <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
        </View>
      ))}

      <TouchableOpacity style={[styles.btn, (busy || files.length === 0) && styles.btnDisabled]} disabled={busy || files.length === 0} onPress={generate}>
        <Text style={styles.btnText}>{busy ? 'Generating…' : 'Generate from slides'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghost} onPress={() => { setEditIndex(null); setEditorVisible(true); }}>
        <Text style={styles.ghostText}>Add a question manually</Text>
      </TouchableOpacity>
      {!!status && <Text style={styles.status}>{status}</Text>}

      {drafts.length > 0 && <Text style={styles.section}>Review ({drafts.length})</Text>}
      {drafts.map((q, idx) => (
        <QuestionCard key={idx} q={q} onEdit={() => { setEditIndex(idx); setEditorVisible(true); }} onRemove={() => setDrafts((prev) => prev.filter((_, j) => j !== idx))} />
      ))}

      {drafts.length > 0 && (
        <TouchableOpacity style={styles.btn} onPress={publish}>
          <Text style={styles.btnText}>Publish to students</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.ghost} onPress={() => navigation.getParent()?.navigate('MazeLevels')}>
        <Text style={styles.ghostText}>Preview student games</Text>
      </TouchableOpacity>

      <QuestionEditor visible={editorVisible} initial={editIndex == null ? null : drafts[editIndex]} onSave={saveEditor} onClose={() => setEditorVisible(false)} />
    </ScrollView>
  );
}

function LivePane({ bottom }) {
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTest(await api.getMyLatestTest()); setStatus(''); } catch (e) { setStatus(e.message); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveQuestions(questions) {
    await api.updateTestQuestions(test.id, questions);
    setTest({ ...test, questions });
  }

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />;

  if (!test || test.questions.length === 0) {
    return (
      <View style={[styles.body, { paddingBottom: bottom + 40 }]}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing live yet</Text>
          <Text style={styles.emptyText}>Build a quiz in Create, then publish it. Students will play it in every game.</Text>
        </View>
        {!!status && <Text style={styles.status}>{status}</Text>}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.body, { paddingBottom: bottom + 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[COLORS.primary]} />}
    >
      <Text style={styles.liveTitle}>Live: {test.topic}</Text>
      <Text style={styles.sub}>{test.questions.length} question{test.questions.length === 1 ? '' : 's'} students are playing right now.</Text>
      {!!status && <Text style={styles.status}>{status}</Text>}
      {test.questions.map((q, idx) => (
        <QuestionCard
          key={idx}
          q={q}
          onEdit={() => { setEditIndex(idx); setEditorVisible(true); }}
          onRemove={async () => {
            try { await saveQuestions(test.questions.filter((_, j) => j !== idx)); } catch (e) { setStatus(e.message); }
          }}
        />
      ))}
      <TouchableOpacity style={styles.ghost} onPress={async () => { try { await api.clearQuizBank(); setTest(null); } catch (e) { setStatus(e.message); } }}>
        <Text style={[styles.ghostText, { color: COLORS.error }]}>Clear published quiz</Text>
      </TouchableOpacity>
      <QuestionEditor
        visible={editorVisible}
        initial={editIndex == null ? null : test.questions[editIndex]}
        onSave={async (q) => {
          try { await saveQuestions(test.questions.map((d, i) => (i === editIndex ? q : d))); setEditorVisible(false); } catch (e) { setStatus(e.message); }
        }}
        onClose={() => setEditorVisible(false)}
      />
    </ScrollView>
  );
}

function QuestionCard({ q, onEdit, onRemove }) {
  return (
    <View style={styles.qCard}>
      <View style={styles.qActions}>
        <TouchableOpacity onPress={onEdit}><Ionicons name="create-outline" size={18} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity onPress={onRemove}><Ionicons name="close" size={20} color={COLORS.error} /></TouchableOpacity>
      </View>
      <Text style={styles.qTag}>{q.subject}</Text>
      <Text style={styles.qText}>{q.q}</Text>
      {(q.opts || []).map((o, i) => (
        <Text key={i} style={[styles.qOpt, i === q.correct && styles.qOptCorrect]}>
          {i === q.correct ? '✔  ' : '·  '}{o}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    ...SHADOWS.small,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segmentActive: { backgroundColor: COLORS.primarySoft },
  segmentText: { fontWeight: '700', color: COLORS.textSecondary, fontSize: 13 },
  segmentTextActive: { color: COLORS.primary },
  body: { paddingHorizontal: 20, paddingTop: 10 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  upload: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.primaryFaded,
    marginBottom: 10,
  },
  uploadTitle: { color: COLORS.primary, fontWeight: '700', marginTop: 8 },
  uploadHint: { color: COLORS.textTertiary, fontSize: 12, marginTop: 4 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: 12, padding: 12, marginBottom: 8 },
  fileName: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  ghost: { paddingVertical: 14, alignItems: 'center' },
  ghostText: { color: COLORS.primary, fontWeight: '700' },
  status: { color: COLORS.primaryDark, textAlign: 'center', marginVertical: 8, fontSize: 13 },
  section: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12, marginBottom: 8 },
  liveTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  sub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: 12, lineHeight: 20 },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, ...SHADOWS.small },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  qCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 10, ...SHADOWS.small },
  qActions: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', gap: 12, zIndex: 2 },
  qTag: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginBottom: 6 },
  qText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', paddingRight: 48, marginBottom: 8 },
  qOpt: { color: COLORS.textSecondary, fontSize: 13, paddingVertical: 2 },
  qOptCorrect: { color: COLORS.success, fontWeight: '700' },
});
