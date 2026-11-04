import MemoryGameView from '../components/games/MemoryGameView';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { uuid } from 'expo-modules-core';
import { useFocusEffect } from '@react-navigation/native';

const GAME_TIME = 60;

// Runtime-only recovery; no persisted session or private deck is stored here.
let activeMemoryAttempt = null;
const recordedMemoryResults = new Set();

export default function MemoryFlipScreen({ navigation }) {
  const { user, recordGame } = useAuth();
  const [phase, setPhase] = useState('start');
  const [board, setBoard] = useState(null);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [resultData, setResultData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const boardRef = useRef(null);
  const attemptRef = useRef(null);
  const pendingRef = useRef(false);
  const retryRef = useRef(null);
  const mountedRef = useRef(false);
  const focusedRef = useRef(false);
  const generationRef = useRef(0);
  const clockOffsetRef = useRef(0);
  const refreshAtRef = useRef(0);
  const queuedRecoveryRef = useRef(false);
  const runRef = useRef(null);
  const ownerRef = useRef(user?.id);
  ownerRef.current = user?.id;

  function serverTime() { return Date.now() + clockOffsetRef.current; }

  function adopt(state) {
    const previous = boardRef.current;
    if (previous?.attempt_id === state.attempt_id && previous.state_version != null &&
        state.state_version != null && state.state_version < previous.state_version) {
      throw new Error('Received older Memory state. Recover to continue.');
    }
    if (previous?.attempt_id === state.attempt_id && previous.status === 'completed' && state.status !== 'completed') {
      throw new Error('Received nonterminal state for a completed Memory attempt.');
    }
    if (state.server_now) clockOffsetRef.current = Date.parse(state.server_now) - Date.now();
    boardRef.current = state;
    setBoard(state);
    setTimeLeft(Math.max(0, Math.ceil((Date.parse(state.deadline_at) - serverTime()) / 1000)));
    // Poll safe state during a mismatch; only the server may hide/clear its selections.
    refreshAtRef.current = state.cards.filter((card) => card.face_up && !card.matched).length >= 2
      ? Date.now() + 150 : 0;
    if (state.status !== 'completed') {
      setPhase('playing');
      return;
    }
    refreshAtRef.current = 0;
    const completedAt = Date.parse(state.completed_at);
    const remaining = Math.max(0, Math.min(GAME_TIME,
      (Date.parse(state.deadline_at) - (Number.isFinite(completedAt) ? completedAt : serverTime())) / 1000));
    // Legacy compatibility only. Trusted XP is already finalized by the server.
    const bonus = state.won ? Math.max(20, Math.round(remaining * 1.5)) : 0;
    const awardedCoins = Number.isInteger(state.coins_awarded) && state.coins_awarded >= 0 ? state.coins_awarded : bonus;
    setResultData({ won: state.won, moves: state.moves, matched: state.matched_pairs,
      timeLeft: Math.floor(remaining), bonus: awardedCoins, coins: awardedCoins, xp: state.xp_awarded });
    setPhase('result');
    if (!recordedMemoryResults.has(state.attempt_id)) {
      recordedMemoryResults.add(state.attempt_id);
      Promise.resolve(recordGame('memory_match', { coinsEarned: awardedCoins, score: bonus })).catch(() => {
        // A legacy stats failure never invalidates trusted completion or triggers a second award.
      });
    }
  }

  async function run(request) {
    if (pendingRef.current || !mountedRef.current || !focusedRef.current) {
      if (request.kind === 'state') queuedRecoveryRef.current = true;
      return;
    }
    const generation = generationRef.current;
    const ownerId = ownerRef.current;
    const current = () => mountedRef.current && focusedRef.current &&
      generationRef.current === generation && ownerRef.current === ownerId;
    pendingRef.current = true;
    retryRef.current = request;
    setBusy(true);
    setError('');
    let flipAccepted = false;
    try {
      let attemptId = attemptRef.current;
      if (!attemptId && activeMemoryAttempt?.ownerId === ownerId) {
        attemptId = activeMemoryAttempt.attemptId;
        attemptRef.current = attemptId;
      }
      if (request.kind === 'start') {
        const started = await api.startMemoryMatchAttempt();
        attemptId = started.attempt_id;
        // Keep the ID even if the screen leaves while the server starts the attempt.
        if (ownerRef.current === ownerId) activeMemoryAttempt = { ownerId, attemptId, pending: null };
        if (!current()) return;
        attemptRef.current = attemptId;
        request = { kind: 'state' };
        retryRef.current = request;
      }
      if (!attemptId) throw new Error('No Memory attempt to recover.');
      if (request.kind === 'flip') {
        await api.flipMemoryMatchCard(attemptId, request.cardId, request.actionId);
        flipAccepted = true;
      } else if (request.kind === 'timeout') {
        await api.timeoutMemoryMatchAttempt(attemptId);
      }
      const state = await api.getMemoryMatchState(attemptId);
      if (!current()) return;
      adopt(state);
      const savedAction = activeMemoryAttempt?.attemptId === attemptId ? activeMemoryAttempt.pending : null;
      if (state.status !== 'completed' && request.kind !== 'flip' && savedAction) {
        retryRef.current = savedAction;
        setError('Board recovered. Retry the pending flip with its original action ID to confirm its outcome.');
      } else {
        retryRef.current = null;
        if (activeMemoryAttempt?.attemptId === attemptId) activeMemoryAttempt.pending = null;
      }
    } catch (err) {
      // A PostgreSQL rejection rolled back this action; uncertain transport failures retain it.
      if (request.kind === 'flip' && !flipAccepted && err.rejected && activeMemoryAttempt?.attemptId === attemptRef.current) {
        activeMemoryAttempt.pending = null;
        if (current()) retryRef.current = { kind: 'state' };
      }
      if (current()) {
        const code = err.code ? ' (' + err.code + ')' : '';
        setError((err.message || 'Memory request failed. Retry or recover state.') + code);
      }
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setBusy(false);
      if (queuedRecoveryRef.current && mountedRef.current && focusedRef.current) {
        queuedRecoveryRef.current = false;
        Promise.resolve().then(() => runRef.current({ kind: 'state' }));
      }
    }
  }
  runRef.current = run;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; generationRef.current += 1; };
  }, []);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    setVisible(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
    const saved = activeMemoryAttempt?.ownerId === ownerRef.current ? activeMemoryAttempt : null;
    attemptRef.current = saved?.attemptId ?? null;
    if (saved) runRef.current({ kind: 'state' });
    else {
      boardRef.current = null;
      retryRef.current = null;
      setBoard(null);
      setResultData(null);
      setError('');
      setPhase('start');
    }
    const subscription = AppState.addEventListener('change', (next) => {
      setVisible(next === 'active');
      if (next === 'active' && attemptRef.current) runRef.current({ kind: 'state' });
    });
    return () => {
      focusedRef.current = false;
      generationRef.current += 1;
      setVisible(false);
      subscription.remove();
    };
  }, [user?.id]));

  useEffect(() => {
    if (!visible || phase !== 'playing' || !board) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(board.deadline_at) - serverTime()) / 1000));
      setTimeLeft(remaining);
      if (pendingRef.current || retryRef.current) return;
      if (remaining === 0) runRef.current({ kind: 'timeout' });
      else if (refreshAtRef.current && Date.now() >= refreshAtRef.current) runRef.current({ kind: 'state' });
    };
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [visible, phase, board]);

  function startGame() {
    if (pendingRef.current) return;
    if (attemptRef.current) { run({ kind: 'state' }); return; }
    run({ kind: 'start' });
  }

  function flip(cardId) {
    if (pendingRef.current || retryRef.current || !boardRef.current || boardRef.current.status !== 'in_progress') return;
    const state = boardRef.current;
    const card = state.cards.find((item) => item.card_id === cardId);
    if (!card || card.matched || card.face_up || state.cards.filter((item) => item.face_up && !item.matched).length >= 2) return;
    if (serverTime() >= Date.parse(state.deadline_at)) { run({ kind: 'timeout' }); return; }
    try {
      const actionId = uuid.v4();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionId)) {
        throw new Error('Invalid UUID');
      }
      const request = { kind: 'flip', cardId, actionId };
      activeMemoryAttempt = { ownerId: ownerRef.current, attemptId: attemptRef.current, pending: request };
      run(request);
    } catch {
      setError('The Expo UUID generator is unavailable. Recover state and restart the app.');
    }
  }

  function playAgain() {
    if (pendingRef.current) return;
    activeMemoryAttempt = null;
    attemptRef.current = null;
    boardRef.current = null;
    retryRef.current = null;
    setBoard(null);
    setResultData(null);
    setError('');
    setPhase('start');
  }

  return <MemoryGameView navigation={navigation} phase={phase} board={board} timeLeft={timeLeft} result={resultData} busy={busy} error={error} onStart={startGame} onFlip={flip} onReplay={playAgain} canRecover={!!attemptRef.current}
    onRetry={() => { const pending = activeMemoryAttempt?.pending; run(pending || retryRef.current || { kind: attemptRef.current ? 'state' : 'start' }); }}
    onRecover={() => run({ kind: 'state' })} />;
}
