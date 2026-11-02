import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';

const QUESTION_TIME = 15;
const MAX_QUESTIONS = 10;
const STARTING_LIVES = 3;

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function titleOf(note) {
  const upload = Array.isArray(note?.student_uploads) ? note.student_uploads[0] : note?.student_uploads;
  return upload?.title || upload?.file_name || 'Uploaded study notes';
}

function questionsFrom(note) {
  const concepts = Array.isArray(note?.key_concepts) ? note.key_concepts : [];
  const examples = Array.isArray(note?.examples) ? note.examples : [];
  const pairs = [];
  concepts.forEach((item, i) => {
    const prompt = typeof item?.concept === 'string' ? item.concept.trim() : '';
    const answer = typeof item?.explanation === 'string' ? item.explanation.trim() : '';
    if (prompt && answer) pairs.push({ id: `concept-${i}`, prompt, answer, kind: 'concept' });
  });
  examples.forEach((item, i) => {
    const prompt = typeof item?.title === 'string' ? item.title.trim() : '';
    const answer = typeof item?.explanation === 'string' ? item.explanation.trim() : '';
    if (prompt && answer) pairs.push({ id: `example-${i}`, prompt, answer, kind: 'example' });
  });
  const usable = pairs.slice(0, MAX_QUESTIONS);
  return usable.map((pair) => {
    const distractors = shuffle(usable.filter((other) => other.id !== pair.id))
      .slice(0, Math.min(3, usable.length - 1));
    const options = shuffle([pair, ...distractors]).map((option, index) => ({
      id: `${pair.id}-option-${index}`,
      text: option.answer,
      correct: option.id === pair.id,
    }));
    return {
      id: pair.id,
      prompt: `Which explanation best matches “${pair.prompt}”?`,
      options,
    };
  });
}

export default function QuizRushScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('choose');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [note, setNote] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [correct, setCorrect] = useState(0);
  const [seconds, setSeconds] = useState(QUESTION_TIME);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const resolved = useRef(false);
  const advanceTimer = useRef(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const rows = await api.getStudentStudyNotes();
      setNotes(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setLoadError(error?.message || 'Could not load your uploaded notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadNotes();
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [loadNotes]));

  const current = questions[index];

  useEffect(() => {
    if (phase !== 'playing' || !current || feedback) return undefined;
    resolved.current = false;
    setSeconds(QUESTION_TIME);
    const interval = setInterval(() => setSeconds((remaining) => Math.max(0, remaining - 1)), 1000);
    const timeout = setTimeout(() => handleAnswer(null), QUESTION_TIME * 1000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [phase, index, feedback]);

  function startRun(selectedNote) {
    const deck = questionsFrom(selectedNote);
    if (deck.length < 2) return;
    setNote(selectedNote);
    setQuestions(deck);
    setIndex(0);
    setLives(STARTING_LIVES);
    setCorrect(0);
    setResult(null);
    setFeedback(null);
    setSelected(null);
    setPhase('playing');
  }

  function finish(won, finalCorrect, finalLives) {
    setResult({ won, correct: finalCorrect, lives: finalLives, total: questions.length });
    setPhase('result');
  }

  function handleAnswer(optionId) {
    if (resolved.current || phase !== 'playing' || !current) return;
    resolved.current = true;
    const right = current.options.find((option) => option.id === optionId)?.correct === true;
    const nextCorrect = correct + (right ? 1 : 0);
    const nextLives = lives - (right ? 0 : 1);
    setSelected(optionId);
    setFeedback(right ? 'correct' : optionId == null ? 'timeout' : 'incorrect');
    setCorrect(nextCorrect);
    setLives(nextLives);

    advanceTimer.current = setTimeout(() => {
      const lastQuestion = index + 1 >= questions.length;
      if (nextLives <= 0) {
        finish(false, nextCorrect, 0);
      } else if (lastQuestion) {
        finish(nextCorrect === questions.length, nextCorrect, nextLives);
      } else {
        setIndex((value) => value + 1);
        setSelected(null);
        setFeedback(null);
      }
    }, 700);
  }

  function chooseNotes() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setFeedback(null);
    setNote(null);
    setQuestions([]);
    setPhase('choose');
  }

  const progress = questions.length ? Math.min(100, ((index + (feedback ? 1 : 0)) / questions.length) * 100) : 0;

  return <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={() => phase === 'choose' ? navigation.goBack() : chooseNotes()}>
        <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Quiz Rush</Text>
        {note && <Text numberOfLines={1} style={styles.noteSub}>{titleOf(note)}</Text>}
      </View>
    </View>

    {phase === 'choose' && <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.panel}>
        <Text style={styles.hero}>Choose your study notes</Text>
        <Text style={styles.body}>Answer questions made from concepts and examples in your uploaded notes. You get 15 seconds for each answer and 3 lives.</Text>
        {loading && <ActivityIndicator color={COLORS.primary} style={{ margin: 16 }} />}
        {!!loadError && <Text style={styles.error}>{loadError}</Text>}
        {!!loadError && <TouchableOpacity style={styles.ghost} onPress={loadNotes}><Text style={styles.ghostText}>Try again</Text></TouchableOpacity>}
        {!loading && !loadError && notes.length === 0 && <Text style={styles.empty}>No uploaded notes yet. Upload a PDF in Learn Hub → Own notes, then return here.</Text>}
        {!loading && notes.map((item) => {
          const count = questionsFrom(item).length;
          return <TouchableOpacity key={item.id} disabled={count < 2} style={[styles.option, count < 2 && { opacity: 0.5 }]} onPress={() => startRun(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle} numberOfLines={2}>{titleOf(item)}</Text>
              <Text style={styles.meta}>{count >= 2 ? `${count} questions` : 'Needs at least 2 concepts or examples'}</Text>
            </View>
            {count >= 2 && <Ionicons name="play-circle" size={28} color={COLORS.primary} />}
          </TouchableOpacity>;
        })}
      </View>
    </ScrollView>}

    {phase === 'playing' && current && <ScrollView contentContainerStyle={styles.play}>
      <View style={styles.hud}>
        <Text style={styles.meta}>Lives {lives}/{STARTING_LIVES}</Text>
        <Text style={styles.meta}>Question {index + 1}/{questions.length}</Text>
        <Text style={styles.meta}>{seconds}s</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      {!!feedback && <Text style={[styles.feedback, feedback === 'correct' ? styles.good : styles.bad]}>{feedback === 'correct' ? 'Correct!' : feedback === 'timeout' ? 'Time is up' : 'Not quite'}</Text>}
      <View style={styles.panel}>
        <Text style={styles.prompt}>{current.prompt}</Text>
        {current.options.map((option) => {
          const rightChoice = selected === option.id && feedback === 'correct';
          const wrongChoice = selected === option.id && feedback === 'incorrect';
          return <TouchableOpacity key={option.id} style={[styles.answer, rightChoice && styles.answerRight, wrongChoice && styles.answerWrong]} disabled={!!feedback} onPress={() => handleAnswer(option.id)}>
            <Text style={styles.answerText}>{option.text}</Text>
          </TouchableOpacity>;
        })}
      </View>
    </ScrollView>}

    {phase === 'result' && <View style={styles.panel}>
      <Text style={styles.icon}>{result?.won ? '🏁' : '💪'}</Text>
      <Text style={styles.hero}>{result?.won ? 'Notes mastered!' : result?.lives === 0 ? 'Run over' : 'Quiz complete'}</Text>
      <Text style={styles.body}>You answered {result?.correct || 0} of {result?.total || 0} questions correctly.</Text>
      {result?.lives > 0 && <Text style={styles.meta}>Lives remaining: {result.lives}</Text>}
      <TouchableOpacity style={styles.primary} onPress={() => startRun(note)}><Text style={styles.primaryText}>Play Again</Text></TouchableOpacity>
      <TouchableOpacity style={styles.ghost} onPress={chooseNotes}><Text style={styles.ghostText}>Choose different notes</Text></TouchableOpacity>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.backgroundSecondary, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
  title: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 18 },
  noteSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  list: { paddingBottom: 24 },
  panel: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, ...SHADOWS.small },
  hero: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 19, marginBottom: 10, textAlign: 'center' },
  body: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  empty: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, paddingVertical: 10, textAlign: 'center' },
  error: { color: COLORS.error, textAlign: 'center', marginTop: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginTop: 10 },
  optionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  meta: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 5 },
  play: { flexGrow: 1, justifyContent: 'center', paddingBottom: 24 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  progressTrack: { height: 8, backgroundColor: COLORS.backgroundTertiary, borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  feedback: { textAlign: 'center', fontWeight: '800', marginBottom: 10 },
  good: { color: COLORS.success },
  bad: { color: COLORS.error },
  prompt: { color: COLORS.textPrimary, fontSize: 17, lineHeight: 24, marginBottom: 16, fontWeight: '700' },
  answer: { backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  answerRight: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  answerWrong: { borderColor: COLORS.error, backgroundColor: COLORS.errorLight },
  answerText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  icon: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  primary: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  primaryText: { color: COLORS.white, fontWeight: '800' },
  ghost: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  ghostText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
});

