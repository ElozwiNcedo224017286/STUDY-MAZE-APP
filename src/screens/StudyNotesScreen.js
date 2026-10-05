import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StackHeader from '../components/StackHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';
import { BUSINESS_CASE_NOTES, REVISION_PACK } from '../data/businessCaseRevisionNotes';

const PROGRESS_KEY = '@studymaze_business_case_revision_progress';
const FILTERS = [
  { id: 'all', label: 'All topics' },
  { id: 'todo', label: 'To revise' },
  { id: 'complete', label: 'Complete' },
];

function TeacherNoteCard({ note }) {
  const meta = [note.subject, note.grade && `Grade ${note.grade}`].filter(Boolean).join(' | ');
  return (
    <View style={styles.teacherCard}>
      {meta ? <Text style={styles.teacherMeta}>{meta}</Text> : null}
      <Text style={styles.teacherTitle}>{note.title}</Text>
      <Text style={styles.teacherBody}>{note.content}</Text>
    </View>
  );
}

function FlowDiagram({ diagram }) {
  return (
    <View style={styles.diagram}>
      <Text style={styles.diagramTitle}>{diagram.title}</Text>
      {diagram.steps.map((step, index) => (
        <React.Fragment key={step}>
          <View style={[styles.flowNode, index % 2 ? styles.flowNodeGreen : styles.flowNodePurple]}>
            <Text style={styles.flowNumber}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={styles.flowText}>{step}</Text>
          </View>
          {index < diagram.steps.length - 1 ? (
            <View style={styles.flowConnector}>
              <View style={styles.flowLine} />
              <Ionicons name="chevron-down" size={16} color={COLORS.accentDark} />
            </View>
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

function MatrixDiagram({ diagram }) {
  return (
    <View style={styles.diagram}>
      <Text style={styles.diagramTitle}>{diagram.title}</Text>
      <View style={styles.matrix}>
        {diagram.cells.map((cell, index) => (
          <View key={cell.label} style={[styles.matrixCell, index % 2 ? styles.matrixGreen : styles.matrixPurple]}>
            <Text style={styles.matrixLabel}>{cell.label}</Text>
            <Text style={styles.matrixDetail}>{cell.detail}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LessonDiagram({ diagram }) {
  if (!diagram) return null;
  return diagram.type === 'matrix'
    ? <MatrixDiagram diagram={diagram} />
    : <FlowDiagram diagram={diagram} />;
}

function RevisionTopic({ note, expanded, complete, answerVisible, onToggle, onComplete, onReveal }) {
  return (
    <View style={[styles.topicCard, complete && styles.topicCardComplete]}>
      <TouchableOpacity style={styles.topicHeader} onPress={onToggle} activeOpacity={0.72}>
        <View style={[styles.topicNumber, complete && styles.topicNumberComplete]}>
          {complete
            ? <Ionicons name="checkmark" size={17} color={COLORS.white} />
            : <Text style={styles.topicNumberText}>{note.number}</Text>}
        </View>
        <View style={styles.topicHeading}>
          <Text style={styles.topicTitle}>{note.title}</Text>
          <Text style={styles.topicSummary} numberOfLines={expanded ? undefined : 2}>{note.summary}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.topicContent}>
          {note.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
          ))}

          <View style={styles.bulletList}>
            {note.bullets.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>

          <View style={styles.keyPoint}>
            <Ionicons name="key-outline" size={18} color={COLORS.success} />
            <View style={styles.keyPointCopy}>
              <Text style={styles.keyPointLabel}>Key point</Text>
              <Text style={styles.keyPointText}>{note.keyPoint}</Text>
            </View>
          </View>

          <LessonDiagram diagram={note.diagram} />

          <View style={styles.quickCheck}>
            <View style={styles.quickCheckHeading}>
              <Ionicons name="help-circle-outline" size={19} color={COLORS.primary} />
              <Text style={styles.quickCheckLabel}>Quick check</Text>
            </View>
            <Text style={styles.question}>{note.check.question}</Text>
            {answerVisible ? <Text style={styles.answer}>{note.check.answer}</Text> : null}
            <TouchableOpacity style={styles.revealButton} onPress={onReveal} activeOpacity={0.75}>
              <Ionicons name={answerVisible ? 'eye-off-outline' : 'eye-outline'} size={16} color={COLORS.primary} />
              <Text style={styles.revealText}>{answerVisible ? 'Hide answer' : 'Reveal answer'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.completeButton, complete && styles.completeButtonActive]}
            onPress={onComplete}
            activeOpacity={0.76}
          >
            <Ionicons
              name={complete ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={complete ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.completeText, complete && styles.completeTextActive]}>
              {complete ? 'Revised' : 'Mark as revised'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default function StudyNotesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(BUSINESS_CASE_NOTES[0].id);
  const [completed, setCompleted] = useState([]);
  const [visibleAnswers, setVisibleAnswers] = useState([]);
  const [exporting, setExporting] = useState(null);

  const load = useCallback(async () => {
    try {
      const { materials: rows } = await api.getPublishedNotes();
      setMaterials(rows || []);
    } catch {
      setMaterials([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_KEY)
      .then((value) => setCompleted(value ? JSON.parse(value) : []))
      .catch(() => setCompleted([]));
  }, []);

  const filteredNotes = useMemo(() => BUSINESS_CASE_NOTES.filter((note) => {
    if (filter === 'complete') return completed.includes(note.id);
    if (filter === 'todo') return !completed.includes(note.id);
    return true;
  }), [completed, filter]);

  const percent = Math.round((completed.length / BUSINESS_CASE_NOTES.length) * 100);

  function toggleComplete(id) {
    setCompleted((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function toggleAnswer(id) {
    setVisibleAnswers((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function handleExport(format) {
    if (exporting) return;
    setExporting(format);
    try {
      const { exportRevisionNotes } = await import('../services/revisionNotesExport');
      await exportRevisionNotes(format);
    } catch (error) {
      Alert.alert('Download failed', error?.message || 'The revision notes could not be created.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <StackHeader
        title="Revision Notes"
        subtitle="Teacher summaries for focused recap"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.teacherSection}>
          <Text style={styles.sectionEyebrow}>FROM YOUR TEACHER</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : materials.length ? (
            materials.map((note) => <TeacherNoteCard key={note.id} note={note} />)
          ) : (
            <Text style={styles.emptyText}>No additional teacher notes have been posted yet.</Text>
          )}
        </View>

        <View style={styles.packHeader}>
          <View style={styles.packMetaRow}>
            <View style={styles.subjectTag}>
              <Ionicons name="school-outline" size={14} color={COLORS.primary} />
              <Text style={styles.subjectTagText}>{REVISION_PACK.subject}</Text>
            </View>
            <Text style={styles.packType}>{REVISION_PACK.subtitle}</Text>
          </View>
          <Text style={styles.packTitle}>{REVISION_PACK.title}</Text>
          <Text style={styles.packDescription}>{REVISION_PACK.description}</Text>

          <View style={styles.downloadRow}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleExport('pdf')}
              disabled={Boolean(exporting)}
            >
              {exporting === 'pdf'
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Ionicons name="document-text-outline" size={18} color={COLORS.white} />}
              <Text style={styles.downloadPrimaryText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.wordButton}
              onPress={() => handleExport('docx')}
              disabled={Boolean(exporting)}
            >
              {exporting === 'docx'
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Ionicons name="download-outline" size={18} color={COLORS.primary} />}
              <Text style={styles.downloadSecondaryText}>Word</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressBand}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressLabel}>REVISION PROGRESS</Text>
              <Text style={styles.progressCount}>{completed.length} of {BUSINESS_CASE_NOTES.length} topics</Text>
            </View>
            <Text style={styles.progressPercent}>{percent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
        </View>

        <View style={styles.lessonSection}>
          <View style={styles.filters}>
            {FILTERS.map((item) => {
              const active = item.id === filter;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.filterTab, active && styles.filterTabActive]}
                  onPress={() => setFilter(item.id)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredNotes.map((note) => (
            <RevisionTopic
              key={note.id}
              note={note}
              expanded={expandedId === note.id}
              complete={completed.includes(note.id)}
              answerVisible={visibleAnswers.includes(note.id)}
              onToggle={() => setExpandedId((current) => current === note.id ? null : note.id)}
              onComplete={() => toggleComplete(note.id)}
              onReveal={() => toggleAnswer(note.id)}
            />
          ))}

          {!filteredNotes.length ? (
            <View style={styles.filterEmpty}>
              <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.success} />
              <Text style={styles.filterEmptyText}>No topics in this view.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  teacherSection: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  sectionEyebrow: { fontSize: 11, fontWeight: '900', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0 },
  loader: { marginVertical: 18 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  teacherCard: { backgroundColor: COLORS.white, borderRadius: 8, padding: 18, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.info, ...SHADOWS.small },
  teacherMeta: { color: COLORS.info, fontSize: 11, fontWeight: '800', marginBottom: 6, letterSpacing: 0 },
  teacherTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  teacherBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  packHeader: { backgroundColor: COLORS.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingHorizontal: 20, paddingVertical: 22 },
  packMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  subjectTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryFaded, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6 },
  subjectTagText: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
  packType: { flexShrink: 1, fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'right' },
  packTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8 },
  packDescription: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, marginBottom: 18 },
  downloadRow: { flexDirection: 'row', gap: 10 },
  downloadButton: { height: 42, minWidth: 104, borderRadius: 7, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16 },
  wordButton: { height: 42, minWidth: 104, borderRadius: 7, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16 },
  downloadPrimaryText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  downloadSecondaryText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  progressBand: { backgroundColor: COLORS.inkDark, paddingHorizontal: 20, paddingVertical: 17 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  progressLabel: { color: COLORS.accentLight, fontSize: 10, fontWeight: '900', letterSpacing: 0 },
  progressCount: { color: COLORS.white, fontSize: 13, fontWeight: '700', marginTop: 3 },
  progressPercent: { color: COLORS.accent, fontSize: 22, fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  progressFill: { height: '100%', minWidth: 0, borderRadius: 4, backgroundColor: COLORS.accent },
  lessonSection: { paddingHorizontal: 16, paddingTop: 16 },
  filters: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 14 },
  filterTab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterTabActive: { borderBottomColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.primary },
  topicCard: { backgroundColor: COLORS.white, borderRadius: 8, marginBottom: 11, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.small },
  topicCardComplete: { borderColor: 'rgba(16, 185, 129, 0.45)' },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  topicNumber: { width: 34, height: 34, borderRadius: 7, backgroundColor: COLORS.primaryFaded, alignItems: 'center', justifyContent: 'center' },
  topicNumberComplete: { backgroundColor: COLORS.success },
  topicNumberText: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
  topicHeading: { flex: 1, minWidth: 0 },
  topicTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 },
  topicSummary: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary },
  topicContent: { borderTopWidth: 1, borderTopColor: COLORS.divider, padding: 16 },
  paragraph: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, marginBottom: 12 },
  bulletList: { marginBottom: 14, gap: 9 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  bullet: { width: 6, height: 6, borderRadius: 2, backgroundColor: COLORS.accentDark, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20, color: COLORS.textPrimary },
  keyPoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.successLight, borderLeftWidth: 3, borderLeftColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 16 },
  keyPointCopy: { flex: 1 },
  keyPointLabel: { fontSize: 10, fontWeight: '900', color: COLORS.success, marginBottom: 3, textTransform: 'uppercase' },
  keyPointText: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary, fontWeight: '600' },
  diagram: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.divider, paddingVertical: 15, marginBottom: 16 },
  diagramTitle: { fontSize: 11, fontWeight: '900', color: COLORS.textPrimary, textTransform: 'uppercase', marginBottom: 12 },
  flowNode: { minHeight: 43, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, paddingHorizontal: 11, paddingVertical: 8 },
  flowNodePurple: { backgroundColor: COLORS.primaryFaded, borderLeftColor: COLORS.primary },
  flowNodeGreen: { backgroundColor: COLORS.successLight, borderLeftColor: COLORS.success },
  flowNumber: { width: 28, fontSize: 10, fontWeight: '900', color: COLORS.textSecondary },
  flowText: { flex: 1, fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  flowConnector: { height: 26, alignItems: 'center', justifyContent: 'center' },
  flowLine: { position: 'absolute', width: 2, top: 0, bottom: 7, backgroundColor: COLORS.accentDark },
  matrix: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  matrixCell: { width: '48%', minHeight: 82, padding: 11, borderTopWidth: 3 },
  matrixPurple: { backgroundColor: COLORS.primaryFaded, borderTopColor: COLORS.primary },
  matrixGreen: { backgroundColor: COLORS.successLight, borderTopColor: COLORS.success },
  matrixLabel: { fontSize: 12, lineHeight: 16, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 5 },
  matrixDetail: { fontSize: 11, lineHeight: 16, color: COLORS.textSecondary },
  quickCheck: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 15, marginBottom: 15 },
  quickCheckHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  quickCheckLabel: { fontSize: 11, fontWeight: '900', color: COLORS.primary, textTransform: 'uppercase' },
  question: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary, fontWeight: '700', marginBottom: 9 },
  answer: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, backgroundColor: COLORS.backgroundSecondary, padding: 11, borderLeftWidth: 3, borderLeftColor: COLORS.accent, marginBottom: 9 },
  revealButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  revealText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  completeButton: { height: 40, borderRadius: 7, borderWidth: 1, borderColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  completeButtonActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  completeText: { fontSize: 12, fontWeight: '900', color: COLORS.primary },
  completeTextActive: { color: COLORS.white },
  filterEmpty: { alignItems: 'center', paddingVertical: 30 },
  filterEmptyText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700', marginTop: 8 },
});
