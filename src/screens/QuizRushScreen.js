import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { buildActivePool } from './quizBank';

const RUSH_TARGET = 10;
const RUSH_TIME = 10; // seconds per question

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizRushScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { recordGame } = useAuth();
  const [phase, setPhase] = useState('start'); // 'start' | 'playing' | 'result'
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(RUSH_TIME);
  const [answeredIdx, setAnsweredIdx] = useState(null);
  const [resultData, setResultData] = useState(null);

  const poolRef = useRef([]);
  const coinsRef = useRef(0); // coins earned this run
  const timerRef = useRef(null);
  const livesRef = useRef(3);
  const streakRef = useRef(0);

  const loadPool = useCallback(async () => {
    try {
      const { questions } = await api.getQuizBank();
      poolRef.current = shuffle(buildActivePool(questions));
    } catch (e) {
      poolRef.current = shuffle(buildActivePool([]));
    }
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function startRun() {
    await loadPool();
    livesRef.current = 3; streakRef.current = 0; coinsRef.current = 0;
    setLives(3); setStreak(0); setAnsweredIdx(null);
    setPhase('playing');
    nextQuestion();
  }

  function nextQuestion() {
    if (poolRef.current.length === 0) poolRef.current = shuffle(buildActivePool([]));
    setQuestion(poolRef.current.pop());
    setAnsweredIdx(null);
    setTimeLeft(RUSH_TIME);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0.1) {
          clearInterval(timerRef.current);
          handleMiss();
          return 0;
        }
        return t - 0.1;
      });
    }, 100);
  }

  function handleMiss() {
    loseLife();
  }

  function answer(i) {
    if (answeredIdx !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnsweredIdx(i);
    if (i === question.correct) {
      coinsRef.current += 20;
      streakRef.current += 1;
      setStreak(streakRef.current);
      setTimeout(() => {
        if (streakRef.current >= RUSH_TARGET) finishRun(true);
        else nextQuestion();
      }, 700);
    } else {
      setTimeout(() => loseLife(), 700);
    }
  }

  function loseLife() {
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) finishRun(false);
    else nextQuestion();
  }

  async function finishRun(won) {
    await recordGame('study_quiz', { coinsEarned: coinsRef.current, score: streakRef.current * 10 });
    setResultData({ won, streak: streakRef.current, coins: coinsRef.current });
    setPhase('result');
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
            <Bullet icon="⏱️" text="Each question gives you 10 seconds" />
            <Bullet icon="🪙" text="Correct = +20 coins and a streak point" />
            <Bullet icon="💔" text="Wrong or too slow costs a life" />
            <Bullet icon="🏁" text={`Answer ${RUSH_TARGET} correctly to win the run`} />
            <TouchableOpacity style={styles.btn} onPress={startRun}><Text style={styles.btnText}>Start Run</Text></TouchableOpacity>
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
                ? `You nailed ${RUSH_TARGET} in a row. Total coins: ${resultData.coins}`
                : `You got ${resultData.streak} correct this run. Coins kept: ${resultData.coins}`}
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => setPhase('start')}><Text style={styles.btnText}>Play Again</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Main')}><Text style={styles.btnGhostText}>Back to Home</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const pct = Math.max(0, (timeLeft / RUSH_TIME) * 100);
  return (
    <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { if (timerRef.current) clearInterval(timerRef.current); navigation.goBack(); }}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Quiz Rush</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.playScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hudRow}>
          <View style={styles.lives}>{[0, 1, 2].map((i) => <Text key={i} style={[styles.heart, i >= lives && styles.heartDead]}>❤️</Text>)}</View>
          <Text style={styles.streakText}>Streak: {streak}/{RUSH_TARGET}</Text>
        </View>
        <View style={styles.timerTrack}><View style={[styles.timerFill, { width: `${pct}%` }, pct < 35 && styles.timerFillDanger]} /></View>
        {question && (
          <View style={styles.card}>
            <Text style={styles.quizTag}>{question.subject}</Text>
            <Text style={styles.quizQ}>{question.q}</Text>
            {question.opts.map((opt, i) => {
              const isCorrect = answeredIdx !== null && i === question.correct;
              const isWrong = answeredIdx === i && i !== question.correct;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.quizOpt, isCorrect && styles.quizOptCorrect, isWrong && styles.quizOptWrong]}
                  onPress={() => answer(i)}
                  disabled={answeredIdx !== null}
                >
                  <Text style={styles.quizOptText}>{opt}</Text>
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
