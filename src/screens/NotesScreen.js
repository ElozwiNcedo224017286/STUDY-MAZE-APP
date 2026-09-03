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
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { materials: rows } = await api.getStudyMaterials();
      setMaterials(rows || []);
      setStatus('');
    } catch (e) {
      setStatus(e.message);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function post() {
    if (!title.trim() || !content.trim()) { setStatus('Add a title and some content.'); return; }
    setBusy(true);
    try {
      await api.createStudyMaterial({ title: title.trim(), subject: subject.trim(), grade: grade.trim(), content: content.trim() });
      setTitle(''); setSubject(''); setGrade(''); setContent('');
      setStatus('Note posted to students.');
      await load();
    } catch (e) {
      setStatus(e.message);
    }
    setBusy(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
      <ScreenHeader
        title="Study"
        titleHighlight="Notes"
        subtitle="Share short summaries students can revise in the Learn tab."
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Cell Structure" placeholderTextColor={COLORS.textTertiary} />
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.label}>Subject</Text>
              <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Life Sciences" placeholderTextColor={COLORS.textTertiary} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Grade</Text>
              <TextInput style={styles.input} value={grade} onChangeText={setGrade} placeholder="10" placeholderTextColor={COLORS.textTertiary} />
            </View>
          </View>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.tall]} value={content} onChangeText={setContent} placeholder="Write the study notes…" placeholderTextColor={COLORS.textTertiary} multiline />
          <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={post}>
            <Text style={styles.btnText}>{busy ? 'Posting…' : 'Post to students'}</Text>
          </TouchableOpacity>
          {!!status && <Text style={styles.status}>{status}</Text>}
        </View>

        <Text style={styles.section}>Your notes</Text>
        {loading ? <ActivityIndicator color={COLORS.primary} /> : materials.length === 0 ? (
          <Text style={styles.empty}>No notes yet.</Text>
        ) : materials.map((m) => (
          <View key={m.id} style={styles.noteCard}>
            <TouchableOpacity style={styles.remove} onPress={async () => { try { await api.deleteStudyMaterial(m.id); await load(); } catch (e) { setStatus(e.message); } }}>
              <Ionicons name="close" size={18} color={COLORS.error} />
            </TouchableOpacity>
            <Text style={styles.noteTitle}>{m.title}</Text>
            {(m.subject || m.grade) ? <Text style={styles.noteMeta}>{[m.subject, m.grade && `Grade ${m.grade}`].filter(Boolean).join(' · ')}</Text> : null}
            <Text style={styles.noteBody} numberOfLines={4}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  form: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, ...SHADOWS.small, marginBottom: 20 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  tall: { minHeight: 110, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: COLORS.white, fontWeight: '800' },
  status: { color: COLORS.primaryDark, textAlign: 'center', marginTop: 10, fontSize: 13 },
  section: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  empty: { color: COLORS.textSecondary },
  noteCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 10, ...SHADOWS.small },
  remove: { position: 'absolute', right: 10, top: 10, zIndex: 2 },
  noteTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, paddingRight: 24 },
  noteMeta: { color: COLORS.primary, fontSize: 11, fontWeight: '700', marginTop: 4 },
  noteBody: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 19 },
});
