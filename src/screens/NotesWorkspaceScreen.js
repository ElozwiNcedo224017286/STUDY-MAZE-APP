import { normalizeStudyList } from '../utils/studyLists';
import { Ionicons } from '@expo/vector-icons';
import StudyHero from '../components/learn/StudyHero';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../theme/layout';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import StackHeader from '../components/StackHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';
import { useSubject } from '../context/SubjectContext';
import useSubjectMaterials from '../hooks/useSubjectMaterials';
import SubjectPrompt from '../components/SubjectPrompt';
import { validatePdf } from '../utils/pdfValidation';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function NotesWorkspaceScreen({ navigation, route }) {
  const section = route?.params?.section === 'own-notes' ? 'own-notes' : 'teacher-notes';
  useEffect(() => { navigation.replace('StudyNotes', { section }); }, [navigation, section]);
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Opening study notes" /></View>;
}

export function TeacherNotesPane({ insets }) {
  const { colors: palette } = useTheme();
  const COLORS = palette;
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { activeSubject, status } = useSubject();
  const { materials, loading, error, refresh: load } = useSubjectMaterials();
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const visibleMaterials = useMemo(() => normalizeStudyList(materials, { prefix: 'material' }), [materials]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.body,
        { paddingBottom: insets.bottom + SPACE.section },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          colors={[COLORS.primary]}
        />
      }
    >
      {status !== 'ready' || !activeSubject ? <SubjectPrompt /> : loading ? (
        <ActivityIndicator
          color={COLORS.primary}
          style={{ marginTop: 24 }}
        />
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText} accessibilityRole="alert">{error}</Text>
          <TouchableOpacity onPress={load} accessibilityRole="button"><Text style={styles.emptyTitle}>Retry notes</Text></TouchableOpacity>
        </View>
      ) : visibleMaterials.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No notes yet</Text>

          <Text style={styles.emptyText}>
            When your teacher posts summaries, they will appear here for
            revision.
          </Text>
        </View>
      ) : (
        visibleMaterials.map((m) => (
          <View key={m.listKey} style={styles.noteCard}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={m.title || 'Untitled class note'} accessibilityState={{ expanded: expanded === m.listKey }} onPress={() => setExpanded(previous => previous === m.listKey ? null : m.listKey)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 46, borderRadius: 13, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="book-outline" size={22} color={palette.primaryText} /></View>
              <View style={{ flex: 1 }}><Text style={styles.meta}>{m.subject || activeSubject?.subject_name}</Text><Text style={styles.title}>{m.title || 'Untitled class note'}</Text></View>
              <Ionicons name={expanded === m.listKey ? 'chevron-up' : 'chevron-down'} size={18} color={palette.primaryText} />
            </TouchableOpacity>
            <Text style={[styles.bodyText, { marginTop: 12 }]} numberOfLines={expanded === m.listKey ? undefined : 2}>{m.content}</Text>
            <Text style={{ ...TYPE.caption, color: palette.primaryText, marginTop: 10 }}>{expanded === m.listKey ? 'Tap the title to close' : 'Tap to explore this note'}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

export function OwnNotesPane({ insets }) {
  const { colors: palette } = useTheme();
  const COLORS = palette;
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { colors } = useTheme();
  const { user } = useAuth();
  const { activeSubject, status: subjectStatus } = useSubject();
  const owner = user?.role === 'student' ? user.id : null;
  const rawKey = owner && activeSubject ? `${owner}:${activeSubject.class_subject_id}` : null;
  const contextKey = subjectStatus === 'ready' ? rawKey : null;
  const contextVersion = useRef(0);
  const previousKey = useRef(rawKey);
  if (previousKey.current !== rawKey) {
    previousKey.current = rawKey;
    contextVersion.current += 1;
  }
  const liveContext = useRef(null);
  liveContext.current = { owner, key: contextKey, rawKey, classSubjectId: activeSubject?.class_subject_id, subjectName: activeSubject?.subject_name };
  const mounted = useRef(false);
  const historyRequest = useRef(0);
  const pickerPending = useRef(false);
  const jobRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [notice, setNotice] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState({ key: null, notes: [], loading: true, error: '' });
  const selectedFile = selection?.key === contextKey && selection?.version === contextVersion.current ? selection.file : null;
  const processingStep = processing?.owner === owner ? processing.step : '';
  const uploadError = feedback?.key === contextKey ? feedback.message : '';
  const generatedNotes = result?.key === contextKey ? result.notes : null;
  const uploaded = !!generatedNotes;
  const currentHistory = contextKey && history.key === contextKey;
  const savedNotes = useMemo(() => normalizeStudyList(currentHistory ? history.notes : [], { prefix: 'personal-note' }), [currentHistory, history.notes]);
  const savedNotesLoading = !!contextKey && (!currentHistory || history.loading);
  const historyError = currentHistory ? history.error : '';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      liveContext.current = null;
      historyRequest.current += 1;
      contextVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    if (selection && (selection.key !== rawKey || selection.version !== contextVersion.current)) {
      setSelection(null);
      setResult(null);
      setFeedback(null);
      if (!jobRef.current) setNotice({ owner, message: 'Your current subject changed. Please select the PDF again.' });
    }
  }, [rawKey, owner, selection]);

  const loadSavedNotes = useCallback(async () => {
    const ticket = ++historyRequest.current;
    if (!contextKey || liveContext.current?.key !== contextKey) return;
    const classSubjectId = liveContext.current.classSubjectId;
    setHistory({ key: contextKey, notes: [], loading: true, error: '' });
    try {
      const notes = await api.getStudentStudyNotes(classSubjectId);
      if (mounted.current && ticket === historyRequest.current && liveContext.current?.key === contextKey) {
        setHistory({ key: contextKey, notes, loading: false, error: '' });
      }
    } catch (error) {
      if (mounted.current && ticket === historyRequest.current && liveContext.current?.key === contextKey) {
        setHistory({ key: contextKey, notes: [], loading: false, error: error.message || 'Could not load your personal notes.' });
      }
    }
  }, [contextKey]);
  const refreshHistory = useRef(loadSavedNotes);
  refreshHistory.current = loadSavedNotes;
  useFocusEffect(useCallback(() => {
    loadSavedNotes();
    return () => { historyRequest.current += 1; };
  }, [loadSavedNotes]));

  async function pickPdf() {
    const captured = liveContext.current;
    if (!captured?.key || pickerPending.current || jobRef.current) return;
    const version = contextVersion.current;
    pickerPending.current = true;
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: false, copyToCacheDirectory: true });
      if (!mounted.current) return;
      if (liveContext.current?.key !== captured.key || contextVersion.current !== version) {
        setNotice({ owner: liveContext.current?.owner, message: 'Your current subject changed. Please select the PDF again.' });
        return;
      }
      if (picked.canceled || !picked.assets?.[0]) return;
      const file = picked.assets[0];
      const validation = validatePdf(file);
      if (!validation.valid) {
        setFeedback({ key: captured.key, message: validation.message });
        return;
      }
      setSelection({ key: captured.key, version, file });
      setResult(null);
      setFeedback(null);
      setNotice(null);
    } catch (error) {
      if (mounted.current && liveContext.current?.key === captured.key) setFeedback({ key: captured.key, message: error.message || 'Could not select your PDF.' });
    } finally { pickerPending.current = false; }
  }

  async function uploadPdf() {
    const captured = liveContext.current;
    if (jobRef.current || !captured?.key || !selection || selection.key !== captured.key || selection.version !== contextVersion.current) return;
    const job = Object.freeze({ ...captured, file: selection.file });
    jobRef.current = job;
    setFeedback(null);
    setResult(null);
    setNotice(null);
    const sameAccount = () => mounted.current && liveContext.current?.owner === job.owner;
    const step = (value) => { if (sameAccount()) setProcessing({ owner: job.owner, subjectName: job.subjectName, key: job.key, step: value }); };
    try {
      step('uploading');
      const uploadResult = await api.uploadStudentSlides(job.file, job.classSubjectId);
      const uploadId = uploadResult?.upload?.id;
      if (!uploadId) throw new Error('The upload was created without an upload ID.');
      if (!sameAccount()) return;
      step('validating');
      await api.validateStudentUpload(uploadId);
      if (!sameAccount()) return;
      step('generating');
      const notesResult = await api.generateStudyNotes(uploadId);
      if (!sameAccount()) return;
      if (liveContext.current?.rawKey === job.key) {
        setResult({ key: job.key, notes: notesResult?.notes || null });
        setSelection({ key: job.key, version: contextVersion.current, file: job.file });
        await refreshHistory.current();
      } else {
        setNotice({ owner: job.owner, message: `Your notes for ${job.subjectName} are ready. Return to that subject to view them.` });
      }
    } catch (error) {
      if (sameAccount()) {
        if (liveContext.current?.rawKey === job.key) setFeedback({ key: job.key, message: error.message || 'We could not create your study notes. Please try again.' });
        else setNotice({ owner: job.owner, message: `Notes for ${job.subjectName} could not be created. Return to that subject to retry.` });
      }
    } finally {
      if (jobRef.current === job) jobRef.current = null;
      if (mounted.current) setProcessing(null);
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) {
      return 'Size unavailable';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.body,
        { paddingBottom: insets.bottom + SPACE.section },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {notice?.owner === owner && <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>{notice.message}</Text>}
      {processingStep && <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>{processingStep === 'uploading' ? 'Uploading PDF' : processingStep === 'validating' ? 'Checking PDF' : 'Generating notes'} for {processing.subjectName}...</Text>}
      {!contextKey ? (
        <>
          <Text style={[styles.ownNotesText, { color: colors.textSecondary }]}>Choose your current subject to view or create your personal study notes.</Text>
          <SubjectPrompt />
        </>
      ) : !selectedFile ? (
        <>
          <View style={[styles.ownNotesCard, { borderWidth: 1, borderColor: palette.border }]}>
            <Image source={require('../../assets/Artwork/icon-upload.png')} style={{ width: 74, height: 74, marginBottom: 12 }} resizeMode="contain" accessible={false} />
            <Text style={styles.ownNotesTitle}>Give your PDF a fresh start</Text>
            <Text style={styles.ownNotesText}>Create clear explanations and examples for {activeSubject?.subject_name || 'your current subject'}.</Text>
            <View style={styles.uploadHint}><Text style={styles.uploadHintText}>PDF · 1–5 pages</Text></View>
            <TouchableOpacity style={styles.uploadButton} onPress={pickPdf} disabled={!!processing} accessibilityRole="button" accessibilityLabel="Choose a study PDF"><Text style={styles.uploadButtonText}>Choose a PDF</Text></TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Saved notes</Text>

          {!!uploadError && <Text style={styles.uploadError}>{uploadError}</Text>}
          {savedNotesLoading ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={{ marginTop: 8 }}
            />
          ) : historyError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.uploadError} accessibilityRole="alert">{historyError}</Text>
              <TouchableOpacity onPress={loadSavedNotes} accessibilityRole="button"><Text style={styles.changeButtonText}>Retry personal notes</Text></TouchableOpacity>
            </View>
          ) : savedNotes.length > 0 ? (
            savedNotes.map((note) => (
              <GeneratedStudyNotes
                key={note.listKey}
                notes={note}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No personal notes yet
              </Text>

              <Text style={styles.emptyText}>
                Upload your study slides to create your first set of
                AI-powered study notes.
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.selectedFileCard}>
            <View style={styles.fileIconContainer}>
              <Text style={styles.fileIcon}>PDF</Text>
            </View>

            <View style={styles.fileInfo}>
              <Text
                style={styles.fileName}
                numberOfLines={2}
                ellipsizeMode="middle"
              >
                {selectedFile.name || 'Selected PDF'}
              </Text>

              <Text style={styles.fileMeta}>
                {formatFileSize(selectedFile.size)} · PDF
              </Text>
            </View>
          </View>

          <View style={styles.fileActions}>
            <TouchableOpacity
              style={styles.changeButton}
              activeOpacity={0.8}
              onPress={pickPdf}
              disabled={!!processing}
            >
              <Text style={styles.changeButtonText}>
                Change PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                processingStep && styles.uploadButtonDisabled,
              ]}
              onPress={uploadPdf}
              disabled={!!processing || uploaded}
              activeOpacity={0.85}
            >
            {processingStep ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={COLORS.textInverse}
                />

                <Text style={styles.uploadButtonText}>
                  {processingStep === 'uploading'
                    ? 'Uploading...'
                    : processingStep === 'validating'
                      ? 'Checking PDF...'
                      : 'Creating notes...'}
                </Text>
              </>
            ) : (
              <Text style={styles.uploadButtonText}>
                {uploaded ? 'Notes created' : 'Create study notes'}
              </Text>
            )}
            </TouchableOpacity>

            {uploaded ? (
              <View style={styles.uploadSuccess}>
                <Text style={styles.uploadSuccessTitle}>
                  Study notes created
                </Text>

                <Text style={styles.uploadSuccessText}>
                  Your PDF has been checked and your study notes are ready.
                </Text>
              </View>
            ) : null}

            {uploadError ? (
              <Text style={styles.uploadError}>
                {uploadError}
              </Text>
            ) : null}
          </View>

          {!processing && <TouchableOpacity style={styles.changeButton} accessibilityRole="button" onPress={() => {
            if (jobRef.current) return;
            setSelection(null);
            setResult(null);
            setFeedback(null);
            loadSavedNotes();
          }}><Text style={styles.changeButtonText}>View saved notes</Text></TouchableOpacity>}
          {generatedNotes ? (
            <GeneratedStudyNotes notes={generatedNotes} defaultExpanded />
          ) : (
            <View style={styles.nextStepCard}>
              <Text style={styles.nextStepIcon}>✨</Text>

              <Text style={styles.nextStepTitle}>
                Ready to create your notes
              </Text>

              <Text style={styles.nextStepText}>
                Your PDF will be checked and turned into simple study
                notes with helpful explanations and examples.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function GeneratedStudyNotes({ notes, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { colors: palette } = useTheme();
  const COLORS = palette;
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (!notes) {
    return null;
  }

  const upload = Array.isArray(notes.student_uploads)
  ? notes.student_uploads[0]
  : notes.student_uploads;

  return (
    <View style={styles.generatedNotesWrap}>
      <TouchableOpacity style={styles.generatedNotesHeader} accessibilityRole="button" accessibilityLabel={upload?.title || upload?.file_name || 'Study notes'} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
        <View style={{ width: 42, height: 46, borderRadius: 13, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="document-text-outline" size={22} color={palette.primaryText} /></View>
        <View style={styles.generatedNotesHeaderText}>
          <Text style={styles.generatedNotesTitle}>{upload?.title || upload?.file_name || 'Study notes'}</Text>
          <Text style={styles.generatedNotesFile}>{(notes.key_concepts || []).length} key concepts{upload?.page_count ? ' · ' + upload.page_count + ' pages' : ''}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={palette.primaryText} />
      </TouchableOpacity>
      {!expanded && <Text style={[styles.studySummary, { paddingHorizontal: 16, paddingBottom: 16 }]} numberOfLines={2}>{notes.summary}</Text>}
      {expanded && <>
      <View style={styles.studySectionCard}>
        <Text style={styles.studySectionLabel}>
          TOPIC SUMMARY
        </Text>

        <Text style={styles.studySummary}>
          {notes.summary}
        </Text>
      </View>

      {Array.isArray(notes.key_concepts) &&
      notes.key_concepts.length > 0 ? (
        <View style={styles.studySectionCard}>
          <Text style={styles.studySectionLabel}>
            KEY CONCEPTS
          </Text>

          {notes.key_concepts.map((item, index) => (
            <View
              key={`${item.concept || 'concept'}-${index}`}
              style={styles.conceptBlock}
            >
              <Text style={styles.conceptNumber}>
                {String(index + 1).padStart(2, '0')}
              </Text>

              <View style={styles.conceptContent}>
                <Text style={styles.conceptTitle}>
                  {item.concept}
                </Text>

                <Text style={styles.conceptExplanation}>
                  {item.explanation}
                </Text>

                {item.visual_explanation ? (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxTitle}>
                      Visual explanation
                    </Text>

                    <Text style={styles.infoBoxText}>
                      {item.visual_explanation}
                    </Text>
                  </View>
                ) : null}

                {Array.isArray(item.common_mistakes) &&
                item.common_mistakes.length > 0 ? (
                  <View style={styles.mistakesBox}>
                    <Text style={styles.infoBoxTitle}>
                      Common mistakes
                    </Text>

                    {item.common_mistakes.map((mistake, mistakeIndex) => (
                      <Text
                        key={`${mistake}-${mistakeIndex}`}
                        style={styles.bulletText}
                      >
                        • {mistake}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {Array.isArray(notes.examples) &&
      notes.examples.length > 0 ? (
        <View style={styles.studySectionCard}>
          <Text style={styles.studySectionLabel}>
            EXAMPLES
          </Text>

          {notes.examples.map((example, index) => (
            <View
              key={`${example.title || 'example'}-${index}`}
              style={styles.exampleBlock}
            >
              <Text style={styles.exampleTitle}>
                {example.title}
              </Text>

              <Text style={styles.exampleText}>
                {example.explanation}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {notes.revision_summary ? (
        <View style={styles.revisionCard}>
          <Text style={styles.revisionIcon}>⚡</Text>

          <View style={styles.revisionContent}>
            <Text style={styles.revisionTitle}>
              Quick revision
            </Text>

            <Text style={styles.revisionText}>
              {notes.revision_summary}
            </Text>
          </View>
        </View>
      ) : null}
      </>}
    </View>
  );
}

const createStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    ...SHADOWS.small
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center'
  },
  segmentActive: {
    backgroundColor: COLORS.primarySoft
  },
  segmentText: {
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontSize: 13
  },
  segmentTextActive: {
    color: COLORS.primaryText
  },
  body: {
    ...PAGE_CONTENT,
    paddingHorizontal: 20,
    paddingTop: 4
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    ...SHADOWS.small
  },
  emptyTitle: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
    marginBottom: 6
  },
  emptyText: {
    ...TYPE.body,
    color: COLORS.textSecondary
  },
  noteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    ...SHADOWS.small
  },
  meta: {
    color: COLORS.primaryText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6
  },
  title: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
    marginBottom: 8
  },
  bodyText: {
    ...TYPE.body,
    color: COLORS.textSecondary
  },
  ownNotesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.small
  },
  ownNotesIcon: {
    fontSize: 36,
    marginBottom: 10
  },
  ownNotesTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8
  },
  ownNotesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14
  },
  uploadHint: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 16
  },
  uploadHintText: {
    color: COLORS.primaryText,
    fontSize: 12,
    fontWeight: '700'
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center'
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800'
  },
  uploadError: {
    marginTop: 10,
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center'
  },
  uploadSuccess: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.successLight
  },
  uploadSuccessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success
  },
  uploadSuccessText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 10
  },
  selectedFileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small
  },
  fileIconContainer: {
    width: 58,
    height: 64,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  fileIcon: {
    color: COLORS.primaryText,
    fontSize: 16,
    fontWeight: "800"
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 5
  },
  fileMeta: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  fileActions: {
    marginTop: 12,
    alignItems: 'center'
  },
  changeButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: 'flex-end'
  },
  changeButtonText: {
    color: COLORS.primaryText,
    fontSize: 13,
    fontWeight: '800'
  },
  nextStepCard: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
    alignItems: 'center'
  },
  nextStepIcon: {
    fontSize: 28,
    marginBottom: 8
  },
  nextStepTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6
  },
  nextStepText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center'
  },
  generatedNotesWrap: {
    marginTop: 20
  },
  generatedNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2
  },
  generatedNotesIcon: {
    fontSize: 28,
    marginRight: 10
  },
  generatedNotesHeaderText: {
    flex: 1
  },
  generatedNotesTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  generatedNotesSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.textSecondary
  },
  generatedNotesFile: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryText
  },
  studySectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    ...SHADOWS.small
  },
  studySectionLabel: {
    ...TYPE.eyebrow,
    color: COLORS.primaryText,
    marginBottom: 10
  },
  studySummary: {
    ...TYPE.body,
    color: COLORS.textPrimary
  },
  conceptBlock: {
    flexDirection: 'row',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  conceptNumber: {
    width: 34,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primaryText,
    paddingTop: 2
  },
  conceptContent: {
    flex: 1
  },
  conceptTitle: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
    marginBottom: 6
  },
  conceptExplanation: {
    ...TYPE.body,
    color: COLORS.textSecondary
  },
  infoBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 13,
    marginTop: 12
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary
  },
  mistakesBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 3
  },
  exampleBlock: {
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  exampleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary
  },
  revisionCard: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    ...SHADOWS.small
  },
  revisionIcon: {
    fontSize: 24,
    marginRight: 12
  },
  revisionContent: {
    flex: 1
  },
  revisionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6
  },
  revisionText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary
  }
});
