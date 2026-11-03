import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useSubject } from '../context/SubjectContext';
import SubjectPrompt from '../components/SubjectPrompt';

const RUSH_TARGET = 10;
const RUSH_TIME = 10; // seconds per question

// Legacy coins remain separate from trusted XP. Avoid duplicate writes on RPC retries/remounts.
const recordedLegacyAttempts = new Set();

export default function QuizRushScreen({ navigation }) {
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
  const liveKey = useRef(contextKey);
  liveKey.current = contextKey;
  const [chapterState, setChapterState] = useState({ key: null, rows: [], loading: true, error: '' });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const current = contextKey && chapterState.key === contextKey;
  const chapters = current ? chapterState.rows : [];
  const browseLoading = !!contextKey && (!current || chapterState.loading);
  const browseError = current ? chapterState.error : '';
  const browseVersion = useRef(0);
  const attemptRef = useRef(null);
  const questionRef = useRef(null);
  const pendingRef = useRef(false);
  const retryRef = useRef(null);
  const mountedRef = useRef(false);
  const resolveRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; browseVersion.current += 1; };
  }, []);

  const loadChapters = useCallback(async () => {
    const version = ++browseVersion.current;
    if (!contextKey) return;
    setChapterState({ key: contextKey, rows: [], loading: true, error: '' });
    try {
      const rows = await api.getSubjectChapters(activeSubject.class_subject_id);
      if (mountedRef.current && version === browseVersion.current && liveKey.current === contextKey) {
        setChapterState({ key: contextKey, rows, loading: false, error: '' });
      }
    } catch (err) {
      if (mountedRef.current && version === browseVersion.current && liveKey.current === contextKey) {
        setChapterState({ key: contextKey, rows: [], loading: false, error: err.message || 'Could not load chapters.' });
      }
    }
  }, [contextKey, activeSubject?.class_subject_id]);

  useEffect(() => {
    // A running attempt and its result remain bound to their original chapter.
    if (phase !== 'start' || busy || pendingRef.current) return;
    if (subjectStatus === 'ready' && selectedChapter && selectedChapter.contextKey !== contextKey) {
      setSelectedChapter(null);
      setError('');
    }
    if (!contextKey) {
      browseVersion.current += 1;
      return;
    }
    if (chapterState.key !== contextKey) {
      setSelectedSubject(activeSubject);
      loadChapters();
    }
  }, [phase, busy, subjectStatus, contextKey, chapterState.key, selectedChapter, activeSubject, loadChapters]);

  function changeChapter() {
    if (pendingRef.current || phase === 'playing') return;
    setSelectedChapter(null);
    setError('');
    setPhase('start');
    setSelectedSubject(activeSubject);
    loadChapters();
  }

  function showQuestion(nextQuestion) {
    questionRef.current = nextQuestion;
    setQuestion(nextQuestion);
    setTimeLeft(Math.max(0, (Date.parse(nextQuestion.deadline_at) - Date.now()) / 1000));
    setAnsweredId(null);
    setFeedback(null);
  }

  async function startRun() {
    if (pendingRef.current || !contextKey || selectedChapter?.contextKey !== contextKey || !selectedSubject?.class_subject_id || !selectedChapter?.test_id) return;
    pendingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const attempt = await api.startStudyQuizChapterAttempt(selectedSubject.class_subject_id, selectedChapter.test_id);
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

  if (phase === 'start' && (!contextKey || !selectedChapter || selectedChapter.contextKey !== contextKey)) {
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
            <Text style={styles.heroTitle}>Choose Chapter</Text>
            <Text style={styles.sub}>{activeSubject.subject_name} ? {activeSubject.class_name}</Text>
            {browseLoading ? <ActivityIndicator color={COLORS.primary} accessibilityLabel="Loading chapters" /> : browseError ? (
              <>
                <Text style={styles.sub} accessibilityRole="alert">{browseError}</Text>
                <TouchableOpacity style={styles.btnGhost} onPress={loadChapters}><Text style={styles.btnGhostText}>Retry chapters</Text></TouchableOpacity>
              </>
            ) : chapters.length === 0 ? <Text style={styles.sub}>No published chapters for this subject yet.</Text> : chapters.map((chapter) => (
              <TouchableOpacity key={chapter.test_id} style={[styles.card, styles.browseCard]} onPress={() => { setSelectedSubject(activeSubject); setSelectedChapter({ ...chapter, contextKey }); }}>
                <Text style={styles.quizQ}>{chapter.chapter_title}</Text>
                <Text style={styles.browseText}>Teacher: {chapter.teacher_name || 'Teacher'}</Text>
                <Text style={styles.browseText}>{chapter.question_count} question{chapter.question_count === 1 ? '' : 's'}</Text>
              </TouchableOpacity>
            ))}
          </>}
        </ScrollView>
      </View>
    );
  }

  if (phase === 'start') {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topnav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Quiz Rush</Text>
        </View>
        <View style={styles.centerBody}>
          <View style={styles.card}>
            <Text style={styles.heroTitle}>Beat the Clock</Text>
            <Text style={styles.sub}>{selectedSubject.subject_name} — {selectedChapter.chapter_title}</Text>
            <Bullet icon="⏱️" text="Each question gives you 10 seconds" />
            <Bullet icon="🪙" text="Correct = +20 coins and a streak point" />
            <Bullet icon="💔" text="Wrong or too slow costs a life" />
            <Bullet icon="🏁" text={`Answer ${RUSH_TARGET} correctly to win the run`} />
            {!!error && <Text style={styles.sub}>{error}</Text>}
            <TouchableOpacity style={styles.btn} disabled={busy || !selectedSubject?.class_subject_id || !selectedChapter?.test_id} onPress={startRun}><Text style={styles.btnText}>{busy ? 'Starting...' : 'Start Run'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} disabled={busy} onPress={changeChapter}><Text style={styles.btnGhostText}>Change Chapter</Text></TouchableOpacity>
          </View>
        </View>
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
            <TouchableOpacity style={styles.btnGhost} disabled={busy} onPress={changeChapter}><Text style={styles.btnGhostText}>Change Chapter</Text></TouchableOpacity>
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
