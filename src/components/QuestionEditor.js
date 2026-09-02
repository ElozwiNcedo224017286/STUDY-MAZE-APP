import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { COLORS } from '../theme/colors';

const LETTERS = ['A', 'B', 'C', 'D'];
const EMPTY_Q = { subject: '', q: '', opts: ['', '', '', ''], correct: 0 };

export default function QuestionEditor({ visible, initial, onSave, onClose }) {
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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView>
            <Text style={styles.title}>{initial ? 'Edit question' : 'New question'}</Text>
            <Text style={styles.label}>Subject tag</Text>
            <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="e.g. SCIENCE" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" />
            <Text style={styles.label}>Question</Text>
            <TextInput style={[styles.input, styles.multiline]} value={q} onChangeText={setQ} placeholder="Type the question…" placeholderTextColor={COLORS.textTertiary} multiline />
            <Text style={styles.label}>Options — tap a letter to mark the answer</Text>
            {opts.map((o, i) => (
              <View key={i} style={styles.optRow}>
                <TouchableOpacity style={[styles.letter, correct === i && styles.letterActive]} onPress={() => setCorrect(i)}>
                  <Text style={[styles.letterText, correct === i && styles.letterTextActive]}>{LETTERS[i]}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.optInput]}
                  value={o}
                  onChangeText={(t) => setOpts((prev) => prev.map((p, j) => (j === i ? t : p)))}
                  placeholder={`Option ${LETTERS[i]}`}
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            ))}
            {!!err && <Text style={styles.err}>{err}</Text>}
            <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.ghost} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(26,16,48,0.45)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 18, maxHeight: '88%' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 10,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  letter: {
    width: 40,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterActive: { backgroundColor: COLORS.primary },
  letterText: { fontWeight: '800', color: COLORS.textSecondary },
  letterTextActive: { color: COLORS.white },
  optInput: { flex: 1, marginBottom: 0 },
  err: { color: COLORS.error, marginBottom: 8, fontSize: 13 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  ghost: { paddingVertical: 14, alignItems: 'center' },
  ghostText: { color: COLORS.textSecondary, fontWeight: '700' },
});
