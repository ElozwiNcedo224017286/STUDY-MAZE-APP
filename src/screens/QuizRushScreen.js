import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
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
      <View style={styles.flex}>
        <View style={styles.topnav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
          <Text style={styles.title}>Quiz Rush</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heroTitle}>Beat the Clock</Text>
          <Bullet icon="⏱️" text="Each question gives you 10 seconds" />
          <Bullet icon="🪙" text="Correct = +20 coins and a streak point" />
          <Bullet icon="💔" text="Wrong or too slow costs a life" />
          <Bullet icon="🏁" text={`Answer ${RUSH_TARGET} correctly to win the run`} />
          <TouchableOpacity style={styles.btn} onPress={startRun}><Text style={styles.btnText}>Start Run</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={styles.flex}>
        <View style={styles.card}>
          <Text style={styles.icon}>{resultData.won ? '🏁' : '💀'}</Text>
          <Text style={[styles.heroTitle, !resultData.won && styles.heroTitleLose]}>{resultData.won ? 'RUN COMPLETE' : 'RUN OVER'}</Text>
          <Text style={styles.sub}>
            {resultData.won
              ? `You nailed ${RUSH_TARGET} in a row. Total coins: ${resultData.coins}`
              : `You got ${resultData.streak} correct this run. Coins kept: ${resultData.coins}`}
          </Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhase('start')}><Text style={styles.btnSecondaryText}>Play Again</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Hub')}><Text style={styles.btnGhostText}>Back to Hub</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const pct = Math.max(0, (timeLeft / RUSH_TIME) * 100);
  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { if (timerRef.current) clearInterval(timerRef.current); navigation.goBack(); }}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Quiz Rush</Text>
      </View>
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
  flex: { flex: 1, backgroundColor: colors.bg, padding: 18, paddingTop: 50 },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: colors.ink, fontSize: 18 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 16, padding: 20 },
  heroTitle: { color: colors.gold, fontWeight: '900', fontSize: 17, marginBottom: 12, textAlign: 'center' },
  heroTitleLose: { color: colors.coral },
  icon: { fontSize: 38, textAlign: 'center', marginBottom: 4 },
  sub: { color: colors.inkDim, fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  bulletIcon: { fontSize: 17, width: 26, textAlign: 'center' },
  bulletText: { color: colors.ink, fontSize: 13, flex: 1 },
  btn: { backgroundColor: colors.mint, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#062B1F', fontWeight: '800', fontSize: 14.5 },
  btnSecondary: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { color: '#062B1F', fontWeight: '800', fontSize: 14.5 },
  btnGhost: { borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnGhostText: { color: colors.inkDim, fontWeight: '700', fontSize: 13.5 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lives: { flexDirection: 'row', gap: 3 },
  heart: { fontSize: 15 },
  heartDead: { opacity: 0.25 },
  streakText: { color: colors.teal, fontSize: 12 },
  timerTrack: { height: 8, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  timerFill: { height: '100%', backgroundColor: colors.mint },
  timerFillDanger: { backgroundColor: colors.coral },
  quizTag: { color: colors.coral, fontSize: 10, letterSpacing: 1, marginBottom: 10, fontWeight: '800' },
  quizQ: { color: colors.ink, fontSize: 16, lineHeight: 22, marginBottom: 16 },
  quizOpt: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, padding: 12, marginBottom: 9 },
  quizOptCorrect: { borderColor: colors.mint, backgroundColor: 'rgba(6,255,165,0.12)' },
  quizOptWrong: { borderColor: colors.coral, backgroundColor: 'rgba(255,77,109,0.12)' },
  quizOptText: { color: colors.ink, fontSize: 13.5 }
});
