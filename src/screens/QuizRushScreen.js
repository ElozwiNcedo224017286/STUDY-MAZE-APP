import QuizRushView from '../components/games/QuizRushView';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useSubject } from '../context/SubjectContext';

// Legacy coins remain separate from trusted XP. Avoid duplicate writes on RPC retries/remounts.
const recordedLegacyAttempts = new Set();

export default function QuizRushScreen({ navigation }) {
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

  const validChapter = contextKey && selectedChapter?.contextKey === contextKey ? selectedChapter : null;
  return <QuizRushView navigation={navigation} phase={phase} contextReady={!!contextKey} selectedChapter={validChapter} selectedSubject={selectedSubject} activeSubject={activeSubject} chapters={chapters} browseLoading={browseLoading} browseError={browseError} busy={busy} error={error} result={resultData} lives={lives} correct={streak} question={question} timeLeft={timeLeft} answeredId={answeredId} feedback={feedback}
    onSelectChapter={chapter => { setSelectedSubject(activeSubject); setSelectedChapter({ ...chapter, contextKey }); setError(''); }} onRefresh={loadChapters} onStart={startRun} onChangeChapter={changeChapter} onReplay={() => setPhase('start')} onAnswer={answer} onRetry={() => retryRef.current && resolveQuestion(retryRef.current)} />;
}
