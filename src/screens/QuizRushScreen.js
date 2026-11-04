import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useSubject } from '../context/SubjectContext';
import SubjectPrompt from '../components/SubjectPrompt';
import useStudentStudyNotes from '../hooks/useStudentStudyNotes';

const RUSH_TARGET = 10;
const RUSH_TIME = 10; // seconds per question

function countQuizConcepts(notes) {
  const concepts = new Map();
  notes.forEach((note) => {
    const items = [
      ...(Array.isArray(note.key_concepts) ? note.key_concepts : []),
      ...(Array.isArray(note.examples) ? note.examples.map((item) => ({
        concept: typeof item?.title === 'string' ? `Example: ${item.title}` : '',
        explanation: item?.explanation,
      })) : []),
    ];
    items.forEach((item) => {
      if (typeof item?.concept !== 'string' || typeof item?.explanation !== 'string' ||
          !item.concept.trim() || !item.explanation.trim()) return;
      const key = item.concept.trim().toLowerCase();
      if (!concepts.has(key)) concepts.set(key, item.explanation.trim());
    });
  });
  return new Set([...concepts.values()].map((explanation) => explanation.toLowerCase())).size;
}

// Legacy coins remain separate from trusted XP. Avoid duplicate writes on RPC retries/remounts.
const recordedLegacyAttempts = new Set();

export default function QuizRushScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { recordGame, user } = useAuth();
  const [phase, setPhase] = useState('start');
  const [lives, setLives] = useState(0);
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredId, setAnsweredId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { activeSubject, status: subjectStatus } = useSubject();
  const contextKey = subjectStatus === 'ready' && activeSubject ? `${user?.id}:${activeSubject.class_subject_id}` : null;
  const routeModule = route?.params?.moduleName || '';
  const { notes, loading: notesLoading, error: notesError, refresh: refreshNotes } = useStudentStudyNotes();
  const availableNoteQuestions = countQuizConcepts(notes);
  const [sourceMode, setSourceMode] = useState(route?.params?.sourceMode === 'teacher' ? 'teacher' : 'notes');
  const [teacherModulesState, setTeacherModulesState] = useState({ key: null, rows: [], loading: false, error: '' });
  const [selectedTeacherModule, setSelectedTeacherModule] = useState(routeModule);
  const teacherModule = selectedTeacherModule;
  const [chapterState, setChapterState] = useState({ key: null, moduleName: '', rows: [], loading: false, error: '' });
  const [selectedChapter, setSelectedChapter] = useState(null);
  const liveKey = useRef(contextKey);
  liveKey.current = contextKey;
  const chapterRequest = useRef(0);
  const moduleRequest = useRef(0);
  const attemptRef = useRef(null);
  const questionRef = useRef(null);
  const pendingRef = useRef(false);
  const retryRef = useRef(null);
  const mountedRef = useRef(false);
  const resolveRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; chapterRequest.current += 1; moduleRequest.current += 1; };
  }, []);

  const loadTeacherModules = useCallback(async () => {
    const request = ++moduleRequest.current;
    if (!contextKey || !activeSubject?.class_subject_id) return;
    setTeacherModulesState({ key: contextKey, rows: [], loading: true, error: '' });
    try {
      const rows = await api.getSubjectModules(activeSubject.class_subject_id);
      if (mountedRef.current && request === moduleRequest.current && liveKey.current === contextKey) {
        setTeacherModulesState({ key: contextKey, rows, loading: false, error: '' });
        setSelectedTeacherModule((previous) =>
          routeModule || rows.find((row) => row.module_name.toLowerCase() === previous.toLowerCase())?.module_name ||
          rows[0]?.module_name || '');
      }
    } catch (loadError) {
      if (mountedRef.current && request === moduleRequest.current && liveKey.current === contextKey) {
        setTeacherModulesState({
          key: contextKey,
          rows: [],
          loading: false,
          error: loadError.message || 'Could not load teacher modules.',
        });
      }
    }
  }, [activeSubject?.class_subject_id, contextKey, routeModule]);

  const loadTeacherQuizzes = useCallback(async () => {
    const request = ++chapterRequest.current;
    if (!contextKey || !activeSubject?.class_subject_id || !teacherModule) return;
    setChapterState({ key: contextKey, moduleName: teacherModule, rows: [], loading: true, error: '' });
    try {
      const rows = await api.getSubjectChapters(
        activeSubject.class_subject_id,
        teacherModule,
      );
      if (mountedRef.current && request === chapterRequest.current && liveKey.current === contextKey) {
        setChapterState({ key: contextKey, moduleName: teacherModule, rows, loading: false, error: '' });
      }
    } catch (loadError) {
      if (mountedRef.current && request === chapterRequest.current && liveKey.current === contextKey) {
        setChapterState({
          key: contextKey,
          moduleName: teacherModule,
          rows: [],
          loading: false,
          error: loadError.message || 'Could not load teacher quizzes.',
        });
      }
    }
  }, [activeSubject?.class_subject_id, contextKey, teacherModule]);

  useEffect(() => {
    if (sourceMode !== 'teacher' || !contextKey) return;
    if (teacherModulesState.key !== contextKey) loadTeacherModules();
  }, [sourceMode, contextKey, teacherModulesState.key, loadTeacherModules]);

  useEffect(() => {
    if (sourceMode !== 'teacher' || !contextKey || !teacherModule) return;
    if (chapterState.key !== contextKey || chapterState.moduleName !== teacherModule) loadTeacherQuizzes();
  }, [sourceMode, contextKey, chapterState.key, chapterState.moduleName, teacherModule, loadTeacherQuizzes]);

  useEffect(() => {
    if (route?.params?.sourceMode !== 'teacher') return;
    setSourceMode('teacher');
    const testId = route.params.testId;
    if (!testId || chapterState.key !== contextKey ||
      chapterState.moduleName !== teacherModule || chapterState.loading) return;
    setSelectedChapter(chapterState.rows.find((chapter) => chapter.test_id === testId) || null);
  }, [route?.params?.sourceMode, route?.params?.testId, routeModule, contextKey, teacherModule, chapterState.key, chapterState.moduleName, chapterState.loading, chapterState.rows]);

  useEffect(() => {
    if (routeModule) setSelectedTeacherModule(routeModule);
  }, [routeModule]);

  function showQuestion(nextQuestion) {
    questionRef.current = nextQuestion;
    setQuestion(nextQuestion);
    setTimeLeft(Math.max(0, (Date.parse(nextQuestion.deadline_at) - Date.now()) / 1000));
    setAnsweredId(null);
    setFeedback(null);
  }

  async function startRun() {
    const classSubjectId = activeSubject?.class_subject_id;
    if (pendingRef.current || !contextKey || !classSubjectId) return;
    if (sourceMode === 'teacher' && !selectedChapter?.test_id) return;
    if (sourceMode === 'notes' && availableNoteQuestions < 4) return;
    pendingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const attempt = sourceMode === 'teacher'
        ? await api.startStudyQuizChapterAttempt(classSubjectId, selectedChapter.test_id)
        : await api.startStudyQuizAttempt(classSubjectId);
      if (!mountedRef.current) return;
      attemptRef.current = attempt.attempt_id;
      retryRef.current = null;
      setLives(attempt.lives_remaining);
      setStreak(attempt.correct_count);
      setResultData(null);
      showQuestion(attempt);
      setPhase('playing');
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Could not start the run.');
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }

  async function resolveQuestion(request) {
    if (pendingRef.current || !questionRef.current || request.questionId !== questionRef.current.question_id) return;
    pendingRef.current = true;
    retryRef.current = request;
    setBusy(true);
    setError('');
    setAnsweredId(request.optionId ?? null);
    try {
      const state = request.kind === 'timeout'
        ? await api.timeoutStudyQuizQuestion(request.attemptId, request.questionId)
        : await api.submitStudyQuizAnswer(request.attemptId, request.questionId, request.optionId);
      if (!mountedRef.current) return;
      // All gameplay results, including retries, come exclusively from the server.
      setLives(state.lives_remaining);
      setStreak(state.correct_count);
      setFeedback(state.outcome);
      if (state.status === 'completed') {
        retryRef.current = null;
        questionRef.current = null;
        setQuestion(null);
        const awardedCoins = Number.isInteger(state.coins_awarded) && state.coins_awarded >= 0
          ? state.coins_awarded : state.correct_count * 20;
        setResultData({
          won: state.completed_target,
          streak: state.correct_count,
          lives: state.lives_remaining,
          xp: state.xp_awarded,
          coins: awardedCoins,
        });
        setPhase('result');
        if (!recordedLegacyAttempts.has(state.attempt_id)) {
          recordedLegacyAttempts.add(state.attempt_id);
          // Compatibility only: never used as XP evidence and never sent to trusted RPCs.
          try {
            await recordGame('study_quiz', { coinsEarned: awardedCoins, score: state.correct_count * 10 });
          } catch {
            // Trusted completion/XP remain successful even if legacy stats cannot refresh.
          }
        }
      } else {
        // Preserve brief answer feedback; the next deadline keeps running on the server.
        if (!state.already_resolved) await new Promise((resolve) => setTimeout(resolve, 700));
        if (!mountedRef.current) return;
        retryRef.current = null;
        showQuestion(state.next_question);
      }
    } catch (err) {
      // Retain the exact request for an idempotent retry; do not advance local gameplay.
      if (mountedRef.current) setError(err.message || 'Could not submit the result. Retry to continue.');
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }
  resolveRef.current = resolveQuestion;

  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    const tick = () => {
      const remaining = Math.max(0, (Date.parse(question.deadline_at) - Date.now()) / 1000);
      setTimeLeft(remaining);
      if (remaining === 0 && !pendingRef.current && !retryRef.current) {
        resolveRef.current({ kind: 'timeout', attemptId: attemptRef.current, questionId: question.question_id });
      }
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [phase, question]);

  function answer(optionId) {
    if (pendingRef.current || retryRef.current || !questionRef.current) return;
    const current = questionRef.current;
    // A locally expired display requests server timeout resolution, never a fabricated answer.
    if (Date.now() >= Date.parse(current.deadline_at)) {
      resolveQuestion({ kind: 'timeout', attemptId: attemptRef.current, questionId: current.question_id });
    } else {
      resolveQuestion({ kind: 'answer', attemptId: attemptRef.current, questionId: current.question_id, optionId });
    }
  }

  if (phase === 'start') {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topnav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Quiz Rush</Text>
        </View>
        <ScrollView contentContainerStyle={styles.browseScroll}>
          {!contextKey ? <SubjectPrompt /> : <>
            <Text style={styles.heroTitle}>Play from your notes</Text>
            <Text style={styles.sub}>{activeSubject.subject_name} — {activeSubject.class_name}</Text>
            <View style={styles.sourceTabs}>
              <TouchableOpacity
                style={[styles.sourceTab, sourceMode === 'notes' && styles.sourceTabActive]}
                onPress={() => { setSourceMode('notes'); setSelectedChapter(null); setError(''); }}
              ><Text style={[styles.sourceTabText, sourceMode === 'notes' && styles.sourceTabTextActive]}>My Notes</Text></TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceTab, sourceMode === 'teacher' && styles.sourceTabActive]}
                onPress={() => { setSourceMode('teacher'); setSelectedChapter(null); setError(''); }}
              ><Text style={[styles.sourceTabText, sourceMode === 'teacher' && styles.sourceTabTextActive]}>Teacher Quizzes</Text></TouchableOpacity>
            </View>
            {sourceMode === 'notes' ? <>
            <Text style={styles.browseText}>Quiz Rush questions are created from your saved notes for this subject.</Text>
            {notesLoading ? <ActivityIndicator color={COLORS.primary} accessibilityLabel="Loading saved notes" /> : notesError ? (
              <>
                <Text style={styles.sub} accessibilityRole="alert">{notesError}</Text>
                <TouchableOpacity style={styles.btnGhost} onPress={refreshNotes}><Text style={styles.btnGhostText}>Retry notes</Text></TouchableOpacity>
              </>
            ) : notes.length === 0 ? <Text style={styles.sub}>No saved notes for this subject yet. Upload your notes in Learn Hub → Own Notes first.</Text> : (
              <>
                {notes.map((note) => {
                  const upload = Array.isArray(note.student_uploads) ? note.student_uploads[0] : note.student_uploads;
                  return (
                    <View key={note.id} style={[styles.card, styles.browseCard]}>
                      <Text style={styles.quizQ}>{upload?.title || upload?.file_name || 'Saved study notes'}</Text>
                      <Text style={styles.browseText} numberOfLines={3}>{note.summary}</Text>
                    </View>
                  );
                })}
                {availableNoteQuestions < 4 ? (
                  <Text style={styles.sub}>
                    Quiz Rush needs at least four different explained concepts or examples. Your notes have {availableNoteQuestions}; add more explained material to play.
                  </Text>
                ) : null}
                <View style={styles.card}>
                  <Text style={styles.heroTitle}>Beat the Clock</Text>
                  <Bullet icon="⏱️" text="Each question gives you 10 seconds" />
                  <Bullet icon="🪙" text="Correct = +20 coins and a streak point" />
                  <Bullet icon="💔" text="Wrong or too slow costs a life" />
                  <Bullet icon="🏁" text={`Answer ${RUSH_TARGET} correctly to win the run`} />
                  {!!error && <Text style={styles.sub}>{error}</Text>}
                  <TouchableOpacity style={styles.btn} disabled={busy || availableNoteQuestions < 4} onPress={startRun}><Text style={styles.btnText}>{busy ? 'Starting...' : 'Start Run'}</Text></TouchableOpacity>
                </View>
              </>
            )}
            </> : <>
              <Text style={styles.browseText}>Choose a module your teacher has published for this subject.</Text>
              {teacherModulesState.key !== contextKey || teacherModulesState.loading ? (
                <ActivityIndicator color={COLORS.primary} accessibilityLabel="Loading teacher modules" />
              ) : teacherModulesState.error ? (
                <>
                  <Text style={styles.sub} accessibilityRole="alert">{teacherModulesState.error}</Text>
                  <TouchableOpacity style={styles.btnGhost} onPress={loadTeacherModules}><Text style={styles.btnGhostText}>Retry modules</Text></TouchableOpacity>
                </>
              ) : teacherModulesState.rows.length === 0 ? (
                <Text style={styles.sub}>No teacher modules are available for this subject yet.</Text>
              ) : (
                teacherModulesState.rows.map((item) => (
                  <TouchableOpacity
                    key={item.module_name.toLowerCase()}
                    style={[styles.card, styles.browseCard, teacherModule.toLowerCase() === item.module_name.toLowerCase() && styles.chapterSelected]}
                    onPress={() => { setSelectedTeacherModule(item.module_name); setSelectedChapter(null); setError(''); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: teacherModule.toLowerCase() === item.module_name.toLowerCase() }}
                  >
                    <Text style={styles.quizQ}>{item.module_name}</Text>
                  </TouchableOpacity>
                ))
              )}
              {teacherModule ? (
                chapterState.key !== contextKey || chapterState.moduleName !== teacherModule || chapterState.loading ? (
                  <ActivityIndicator color={COLORS.primary} accessibilityLabel={`Loading ${teacherModule} quizzes`} />
                ) : chapterState.error ? (
                  <>
                    <Text style={styles.sub} accessibilityRole="alert">{chapterState.error}</Text>
                    <TouchableOpacity style={styles.btnGhost} onPress={loadTeacherQuizzes}><Text style={styles.btnGhostText}>Retry teacher quizzes</Text></TouchableOpacity>
                  </>
                ) : chapterState.rows.length === 0 ? (
                  <Text style={styles.sub}>No teacher quizzes are available for this module yet.</Text>
                ) : chapterState.rows.map((chapter) => (
                  <TouchableOpacity
                    key={chapter.test_id}
                    style={[styles.card, styles.browseCard, selectedChapter?.test_id === chapter.test_id && styles.chapterSelected]}
                    onPress={() => { setSelectedChapter(chapter); setError(''); }}
                  >
                    <Text style={styles.quizQ}>{chapter.chapter_title}</Text>
                    <Text style={styles.browseText}>Teacher: {chapter.teacher_name || 'Teacher'}</Text>
                    <Text style={styles.browseText}>{chapter.question_count} question{chapter.question_count === 1 ? '' : 's'}</Text>
                  </TouchableOpacity>
                ))
              ) : null}
              {selectedChapter && (
                <View style={styles.card}>
                  <Text style={styles.heroTitle}>{selectedChapter.chapter_title}</Text>
                  <Bullet icon="⏱️" text="Each question gives you 10 seconds" />
                  <Bullet icon="🪙" text="Correct = +20 coins and a streak point" />
                  <Bullet icon="💔" text="Wrong or too slow costs a life" />
                  <Bullet icon="🏁" text={`Answer ${RUSH_TARGET} correctly to win the run`} />
                  {!!error && <Text style={styles.sub}>{error}</Text>}
                  <TouchableOpacity style={styles.btn} disabled={busy} onPress={startRun}><Text style={styles.btnText}>{busy ? 'Starting...' : 'Start Teacher Quiz'}</Text></TouchableOpacity>
                </View>
              )}
            </>}
          </>}
        </ScrollView>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
        <View style={styles.centerBody}>
          <View style={styles.card}>
            <Text style={styles.icon}>{resultData.won ? '🏁' : '💀'}</Text>
            <Text style={[styles.heroTitle, !resultData.won && styles.heroTitleLose]}>{resultData.won ? 'Run complete!' : 'Run over'}</Text>
            <Text style={styles.sub}>
              {resultData.won
                ? `You answered ${resultData.streak} correctly. Coins earned: ${resultData.coins}`
                : `You got ${resultData.streak} correct this run. Coins kept: ${resultData.coins}`}
            </Text>
            <Text style={styles.sub}>{resultData.xp} XP earned; {resultData.lives} lives remaining</Text>
            <TouchableOpacity style={styles.btn} disabled={busy} onPress={() => setPhase('start')}><Text style={styles.btnText}>Play Again</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Main')}><Text style={styles.btnGhostText}>Back to Home</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const pct = Math.min(100, Math.max(0, (timeLeft / RUSH_TIME) * 100));
  return (
    <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Quiz Rush</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.playScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hudRow}>
          <View style={styles.lives}>{[0, 1, 2].map((i) => <Text key={i} style={[styles.heart, i >= lives && styles.heartDead]}>❤️</Text>)}</View>
          <Text style={styles.streakText}>Correct: {streak}/{RUSH_TARGET}</Text>
        </View>
        <View style={styles.timerTrack}><View style={[styles.timerFill, { width: `${pct}%` }, pct < 35 && styles.timerFillDanger]} /></View>
        {!!error && (
          <View>
            <Text style={styles.sub}>{error}</Text>
            <TouchableOpacity style={styles.btnGhost} disabled={busy} onPress={() => retryRef.current && resolveQuestion(retryRef.current)}>
              <Text style={styles.btnGhostText}>{busy ? 'Retrying...' : 'Retry submission'}</Text>
            </TouchableOpacity>
          </View>
        )}
        {busy && !feedback && <Text style={styles.sub}>Checking with server...</Text>}
        {feedback && <Text style={styles.sub}>{feedback === 'correct' ? 'Correct!' : feedback === 'timeout' ? 'Time expired' : 'Incorrect'}</Text>}
        {question && (
          <View style={styles.card}>
            <Text style={styles.quizTag}>{question.subject}</Text>
            <Text style={styles.quizQ}>{question.prompt}</Text>
            {question.options.map((opt) => {
              const isCorrect = answeredId === opt.id && feedback === 'correct';
              const isWrong = answeredId === opt.id && feedback === 'incorrect';
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.quizOpt, isCorrect && styles.quizOptCorrect, isWrong && styles.quizOptWrong]}
                  onPress={() => answer(opt.id)}
                  disabled={busy || !!error || !!feedback}
                >
                  <Text style={styles.quizOptText}>{opt.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Bullet({ icon, text }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletIcon}>{icon}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  browseScroll: { paddingBottom: 28, gap: 12 },
  browseCard: { marginTop: 4 },
  chapterSelected: { borderWidth: 2, borderColor: COLORS.primary },
  sourceTabs: { flexDirection: 'row', backgroundColor: COLORS.backgroundSecondary, padding: 4, borderRadius: 12, marginBottom: 12 },
  sourceTab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  sourceTabActive: { backgroundColor: COLORS.white, ...SHADOWS.small },
  sourceTabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  sourceTabTextActive: { color: COLORS.primary, fontWeight: '800' },
  browseText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  flex: { flex: 1, backgroundColor: COLORS.backgroundSecondary, paddingHorizontal: 14 },
  centerBody: { flex: 1, justifyContent: 'center' },
  playScroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: 24 },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  title: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 18 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, ...SHADOWS.small },
  heroTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 20, marginBottom: 16, textAlign: 'center' },
  heroTitleLose: { color: COLORS.error },
  icon: { fontSize: 46, textAlign: 'center', marginBottom: 8 },
  sub: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  bullet: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  bulletIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  bulletText: { color: COLORS.textPrimary, fontSize: 15, flex: 1 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 10, ...SHADOWS.small },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  btnGhost: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  lives: { flexDirection: 'row', gap: 4 },
  heart: { fontSize: 20 },
  heartDead: { opacity: 0.25 },
  streakText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  timerTrack: { height: 10, backgroundColor: COLORS.backgroundTertiary, borderRadius: 6, overflow: 'hidden', marginBottom: 20 },
  timerFill: { height: '100%', backgroundColor: COLORS.primary },
  timerFillDanger: { backgroundColor: COLORS.error },
  quizTag: { color: COLORS.primary, fontSize: 12, letterSpacing: 1, marginBottom: 12, fontWeight: '800' },
  quizQ: { color: COLORS.textPrimary, fontSize: 17, lineHeight: 23, marginBottom: 18, fontWeight: '600' },
  quizOpt: { backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 12 },
  quizOptCorrect: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  quizOptWrong: { borderColor: COLORS.error, backgroundColor: COLORS.errorLight },
  quizOptText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
});
