import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';
import { validatePdf } from '../utils/pdfValidation';

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState('teacher-notes');

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.backgroundSecondary}
      />

      <ScreenHeader
        title="Learn"
        titleHighlight="Hub"
        subtitle="Learn from your teacher or turn your own slides into study notes."
      />

      <View style={styles.segmentWrap}>
        {['teacher-notes', 'own-notes'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.segment,
              segment === key && styles.segmentActive,
            ]}
            onPress={() => setSegment(key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                segment === key && styles.segmentTextActive,
              ]}
            >
              {key === 'teacher-notes' ? 'Teacher notes' : 'Own notes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {segment === 'teacher-notes' ? (
        <TeacherNotesPane insets={insets} />
      ) : (
        <OwnNotesPane insets={insets} />
      )}
    </View>
  );
}

function TeacherNotesPane({ insets }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { materials: rows } = await api.getPublishedNotes();
      setMaterials(rows || []);
    } catch {
      setMaterials([]);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.body,
        { paddingBottom: insets.bottom + 100 },
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
      {loading ? (
        <ActivityIndicator
          color={COLORS.primary}
          style={{ marginTop: 24 }}
        />
      ) : materials.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No notes yet</Text>

          <Text style={styles.emptyText}>
            When your teacher posts summaries, they will appear here for
            revision.
          </Text>
        </View>
      ) : (
        materials.map((m) => (
          <View key={m.id} style={styles.noteCard}>
            {(m.subject || m.grade) ? (
              <Text style={styles.meta}>
                {[m.subject, m.grade && `Grade ${m.grade}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}

            <Text style={styles.title}>{m.title}</Text>

            <Text style={styles.bodyText}>{m.content}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function OwnNotesPane({ insets }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [savedNotes, setSavedNotes] = useState([]);
  const [savedNotesLoading, setSavedNotesLoading] = useState(true);

  const loadSavedNotes = useCallback(async () => {
    try {
      setSavedNotesLoading(true);

      const notes = await api.getStudentStudyNotes();

      setSavedNotes(Array.isArray(notes) ? notes : []);
    } catch (error) {
      console.error('Failed to load saved study notes:', error);
      setSavedNotes([]);
    } finally {
      setSavedNotesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedNotes();
    }, [loadSavedNotes])
  );

  async function pickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];

      if (!file) {
        return;
      }

      const validation = validatePdf(file);

      if (!validation.valid) {
        console.warn('PDF validation failed:', validation.message);
        return;
      }

      setSelectedFile(file);
      setGeneratedNotes(null);
      setUploadError('');
      setUploaded(false);
    } catch (error) {
      console.error('PDF picker error:', error);
    }
  }

  async function uploadPdf() {
    if (!selectedFile || processingStep) {
      return;
    }

    setUploadError('');
    setUploaded(false);
    setGeneratedNotes(null);

    try {
      // Step 1: Upload the PDF
      setProcessingStep('uploading');

      const uploadResult = await api.uploadStudentSlides(selectedFile);
      const uploadId = uploadResult?.upload?.id;

      if (!uploadId) {
        throw new Error('The upload was created without an upload ID.');
      }

      console.log('Student PDF uploaded:', uploadResult);

      // Step 2: Server-side validation
      setProcessingStep('validating');

      const validationResult = await api.validateStudentUpload(uploadId);

      console.log('Student PDF validated:', validationResult);

      // Step 3: Generate AI study notes
      setProcessingStep('generating');

      const notesResult = await api.generateStudyNotes(uploadId);

      console.log('Student study notes generated:', notesResult);

      setGeneratedNotes(notesResult?.notes || null);
      setUploaded(true);
    } catch (error) {
      console.error('Student notes processing failed:', error);

      setUploadError(
        error?.message ||
          'We could not create your study notes. Please try again.'
      );
    } finally {
      setProcessingStep('');
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
        { paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {!selectedFile ? (
        <>
          <View style={styles.ownNotesCard}>
            <Text style={styles.ownNotesIcon}>📝</Text>

            <Text style={styles.ownNotesTitle}>
              Create your own study notes
            </Text>

            <Text style={styles.ownNotesText}>
              Turn your study slides into simple, easy-to-understand notes
              with helpful examples.
            </Text>

            <View style={styles.uploadHint}>
              <Text style={styles.uploadHintText}>
                PDF • 1–5 pages
              </Text>
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              activeOpacity={0.8}
              onPress={pickPdf}
            >
              <Text style={styles.uploadButtonText}>
                + Upload slides
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Your notes</Text>

          {savedNotesLoading ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={{ marginTop: 8 }}
            />
          ) : savedNotes.length > 0 ? (
            savedNotes.map((note) => (
              <GeneratedStudyNotes
                key={note.id}
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
              disabled={!!processingStep}
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
                Upload slides
              </Text>
            )}
            </TouchableOpacity>

            {uploaded ? (
              <View style={styles.uploadSuccess}>
                <Text style={styles.uploadSuccessTitle}>
                  PDF uploaded successfully
                </Text>

                <Text style={styles.uploadSuccessText}>
                  Your slides are safely stored and ready for processing.
                </Text>
              </View>
            ) : null}

            {uploadError ? (
              <Text style={styles.uploadError}>
                {uploadError}
              </Text>
            ) : null}
          </View>

          {generatedNotes ? (
            <GeneratedStudyNotes notes={generatedNotes} />
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

function GeneratedStudyNotes({ notes }) {
  if (!notes) {
    return null;
  }

  const upload = Array.isArray(notes.student_uploads)
  ? notes.student_uploads[0]
  : notes.student_uploads;

  return (
    <View style={styles.generatedNotesWrap}>
      <View style={styles.generatedNotesHeader}>
        <Text style={styles.generatedNotesIcon}>✨</Text>

        <View style={styles.generatedNotesHeaderText}>
          <Text style={styles.generatedNotesTitle}>
            Your study notes
          </Text>

          {upload?.file_name ? (
            <Text
              style={styles.generatedNotesFile}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {upload.file_name}
              {upload.page_count ? ` · ${upload.page_count} pages` : ''}
            </Text>
          ) : null}
        </View>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    ...SHADOWS.small,
  },

  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },

  segmentActive: {
    backgroundColor: COLORS.primarySoft,
  },

  segmentText: {
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  segmentTextActive: {
    color: COLORS.primary,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    ...SHADOWS.small,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  noteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    ...SHADOWS.small,
  },

  meta: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  bodyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },

  ownNotesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  ownNotesIcon: {
    fontSize: 36,
    marginBottom: 10,
  },

  ownNotesTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  ownNotesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },

  uploadHint: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 16,
  },

  uploadHintText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  uploadButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center',
  },

  uploadButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  uploadError: {
    marginTop: 10,
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  uploadSuccess: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.successLight,
  },

  uploadSuccessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },

  uploadSuccessText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },

  selectedFileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },

  fileIconContainer: {
    width: 58,
    height: 64,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  fileIcon: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },

  fileInfo: {
    flex: 1,
  },

  fileName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 5,
  },

  fileMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  fileActions: {
    marginTop: 12,
    alignItems: 'center',
  },

  changeButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },

  changeButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  nextStepCard: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },

  nextStepIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  nextStepTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },

  nextStepText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },

  generatedNotesWrap: {
    marginTop: 20,
  },

  generatedNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  generatedNotesIcon: {
    fontSize: 28,
    marginRight: 10,
  },

  generatedNotesHeaderText: {
    flex: 1,
  },

  generatedNotesTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  generatedNotesSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  generatedNotesFile: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  studySectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },

  studySectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.primary,
    marginBottom: 10,
  },

  studySummary: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textPrimary,
  },

  conceptBlock: {
    flexDirection: 'row',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  conceptNumber: {
    width: 34,
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
    paddingTop: 2,
  },

  conceptContent: {
    flex: 1,
  },

  conceptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  conceptExplanation: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  infoBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 13,
    marginTop: 12,
  },

  infoBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  infoBoxText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },

  mistakesBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
  },

  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  exampleBlock: {
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  exampleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  exampleText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  revisionCard: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    ...SHADOWS.small,
  },

  revisionIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  revisionContent: {
    flex: 1,
  },

  revisionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  revisionText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

});