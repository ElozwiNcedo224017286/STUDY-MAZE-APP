import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function TeacherDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState([]);
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [published, setPublished] = useState(null);

  const refreshPublished = useCallback(async () => {
    try {
      const { meta, questions } = await api.getQuizBank();
      // The author name isn't readable across RLS, so show the signed-in teacher's own name.
      setPublished(meta && questions.length ? { ...meta, teacher: user?.username || meta.teacher, count: questions.length } : null);
    } catch (e) { /* network issue — leave the previous state */ }
  }, [user]);

  useFocusEffect(useCallback(() => { refreshPublished(); }, [refreshPublished]));

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'],
      multiple: true,
      copyToCacheDirectory: true
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
      setGenerated(questions);
      setStatus(`Generated ${questions.length} questions. Review below, then publish.`);
    } catch (e) {
      setStatus(e.message || "Couldn't generate questions — please try again.");
    }
    setBusy(false);
  }

  function removeQuestion(idx) {
    setGenerated((prev) => prev.filter((_, i) => i !== idx));
  }

  async function publish() {
    try {
      await api.publishQuizBank(user.username, topic || 'Uploaded Material', generated);
      setStatus(`Published ${generated.length} questions to all students! 🎉`);
      await refreshPublished();
    } catch (e) {
      setStatus(e.message || 'Could not publish — please try again.');
    }
  }

  async function clearPublished() {
    try {
      await api.clearQuizBank();
      await refreshPublished();
    } catch (e) { /* ignore */ }
  }

  async function handleLogout() {
    await logout();
    navigation.replace('Auth');
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Teacher · <Text style={styles.username}>{user?.username}</Text></Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}><Text style={styles.iconBtnText}>⏻</Text></TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Upload Slides</Text>
      <Text style={styles.sub}>Upload your lesson slides (PDF, PPTX, or TXT) and generate quiz questions straight from the content. Scanned/image-only PDFs won't extract text.</Text>

      <View style={styles.uploadZone}>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickFiles}>
          <Text style={styles.uploadBtnText}>Choose Files</Text>
        </TouchableOpacity>
        <Text style={styles.uploadHint}>You can select multiple files</Text>
      </View>

      {files.map((f, i) => (
        <View key={i} style={styles.fileRow}>
          <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
          <Text>✅</Text>
        </View>
      ))}

      <Text style={styles.label}>Topic / class name</Text>
      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. Grade 10 Life Sciences — Cell Structure"
        placeholderTextColor={colors.inkDim}
      />

      <TouchableOpacity style={[styles.btnSecondary, (busy || files.length === 0) && styles.btnDisabled]} disabled={busy || files.length === 0} onPress={generate}>
        <Text style={styles.btnSecondaryText}>{busy ? 'Generating…' : 'Generate Questions from Slides'}</Text>
      </TouchableOpacity>
      {!!status && <Text style={styles.status}>{status}</Text>}

      {generated.map((q, idx) => (
        <View key={idx} style={styles.genCard}>
          <TouchableOpacity style={styles.removeBtn} onPress={() => removeQuestion(idx)}><Text style={styles.removeBtnText}>×</Text></TouchableOpacity>
          <Text style={styles.genTag}>{q.subject}</Text>
          <Text style={styles.genQ}>{q.q}</Text>
          {q.opts.map((o, i) => (
            <Text key={i} style={[styles.genOpt, i === q.correct && styles.genOptCorrect]}>{i === q.correct ? '✔' : '·'} {o}</Text>
          ))}
        </View>
      ))}

      {generated.length > 0 && (
        <TouchableOpacity style={styles.btn} onPress={publish}>
          <Text style={styles.btnText}>Publish to Students</Text>
        </TouchableOpacity>
      )}

      {published && (
        <View style={styles.publishedBox}>
          <Text style={styles.publishedText}>📚 {published.topic}{'\n'}{published.count} questions published by {published.teacher}</Text>
        </View>
      )}
      {published && (
        <TouchableOpacity style={styles.btnGhost} onPress={clearPublished}>
          <Text style={styles.btnGhostText}>Clear Published Questions</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Hub')}>
        <Text style={styles.btnGhostText}>🎮 Preview Student App</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 18, paddingTop: 50, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  welcome: { color: colors.inkDim, fontSize: 13 },
  username: { color: colors.gold, fontWeight: '800' },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: colors.ink, fontSize: 14 },
  sectionTitle: { color: colors.gold, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  sub: { color: colors.inkDim, fontSize: 12.5, lineHeight: 18, marginBottom: 12 },
  uploadZone: { borderWidth: 2, borderColor: colors.wallEdge, borderStyle: 'dashed', borderRadius: 12, padding: 18, alignItems: 'center', backgroundColor: colors.panel, marginBottom: 10 },
  uploadBtn: { backgroundColor: colors.teal, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  uploadBtnText: { color: '#062B1F', fontWeight: '700', fontSize: 13 },
  uploadHint: { color: colors.inkDim, fontSize: 10.5, marginTop: 8 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 9, padding: 10, marginBottom: 7 },
  fileName: { color: colors.ink, fontSize: 12, flex: 1, marginRight: 8 },
  label: { color: colors.inkDim, fontSize: 11, marginBottom: 5, marginTop: 8 },
  input: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 9, padding: 12, color: colors.ink, fontSize: 13.5, marginBottom: 10 },
  btn: { backgroundColor: colors.mint, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6, marginBottom: 8 },
  btnText: { color: '#062B1F', fontWeight: '800', fontSize: 14.5 },
  btnSecondary: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnSecondaryText: { color: '#062B1F', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  status: { color: colors.mint, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 6 },
  genCard: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, padding: 14, marginBottom: 9, marginTop: 6 },
  removeBtn: { position: 'absolute', right: 8, top: 6, padding: 4 },
  removeBtnText: { color: colors.coral, fontSize: 16 },
  genTag: { color: colors.coral, fontSize: 9.5, letterSpacing: 0.5, marginBottom: 5, fontWeight: '800' },
  genQ: { color: colors.ink, fontSize: 13, marginBottom: 8 },
  genOpt: { color: colors.inkDim, fontSize: 11.5, paddingVertical: 2 },
  genOptCorrect: { color: colors.mint, fontWeight: '700' },
  publishedBox: { backgroundColor: 'rgba(255,214,10,0.08)', borderWidth: 2, borderColor: colors.gold, borderRadius: 10, padding: 12, marginTop: 10 },
  publishedText: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  btnGhost: { borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnGhostText: { color: colors.inkDim, fontWeight: '700', fontSize: 13 }
});
