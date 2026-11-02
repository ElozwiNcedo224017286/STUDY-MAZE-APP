import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';

const LIMIT = 8;
const GAP = 8;
const WIDTH = Math.min(Dimensions.get('window').width - 32, 560);
const SIZE = Math.floor((WIDTH - GAP * 3) / 4);

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pairsFrom(note) {
  const pairs = [];
  (Array.isArray(note?.key_concepts) ? note.key_concepts : []).forEach((item, i) => {
    const left = item?.concept?.trim?.() || '';
    const right = item?.explanation?.trim?.() || '';
    if (left && right) pairs.push({ id: `${note.id}-c-${i}`, left, right });
  });
  (Array.isArray(note?.examples) ? note.examples : []).forEach((item, i) => {
    const left = item?.title?.trim?.() || '';
    const right = item?.explanation?.trim?.() || '';
    if (left && right) pairs.push({ id: `${note.id}-e-${i}`, left, right });
  });
  return pairs.slice(0, LIMIT);
}

function titleOf(note) {
  const upload = Array.isArray(note?.student_uploads) ? note.student_uploads[0] : note?.student_uploads;
  return upload?.title || upload?.file_name || 'Uploaded study notes';
}

export default function MemoryFlipScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('choose');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState(null);
  const [cards, setCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [result, setResult] = useState(null);
  const open = useRef([]);
  const locked = useRef(false);
  const hide = useRef(null);
  const cardsRef = useRef([]);
  const movesRef = useRef(0);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await api.getStudentStudyNotes();
      setNotes(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || 'Could not load your uploaded notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadNotes();
    return () => { if (hide.current) clearTimeout(hide.current); };
  }, [loadNotes]));

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const timer = setInterval(() => setSeconds((s) => {
      if (s <= 1) {
        clearInterval(timer);
        setResult({ won: false, matched: cardsRef.current.filter((c) => c.matched).length / 2, moves: movesRef.current });
        setPhase('result');
        return 0;
      }
      return s - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  function startGame(selected) {
    const pairs = pairsFrom(selected);
    if (pairs.length < 2) return;
    const deck = shuffle(pairs).flatMap((p) => [
      { card_id: `${p.id}-a`, pair_id: p.id, value: p.left, face_up: false, matched: false },
      { card_id: `${p.id}-b`, pair_id: p.id, value: p.right, face_up: false, matched: false },
    ]);
    const mixed = shuffle(deck);
    cardsRef.current = mixed;
    setCards(mixed);
    setNote(selected);
    setMoves(0);
    movesRef.current = 0;
    setSeconds(60);
    setResult(null);
    open.current = [];
    locked.current = false;
    setPhase('playing');
  }

  function flip(id) {
    if (locked.current || phase !== 'playing') return;
    const chosen = cardsRef.current.find((c) => c.card_id === id);
    if (!chosen || chosen.face_up || chosen.matched) return;
    const nextOpen = [...open.current, id];
    open.current = nextOpen;
    const revealed = cardsRef.current.map((c) => c.card_id === id ? { ...c, face_up: true } : c);
    cardsRef.current = revealed;
    setCards(revealed);
    if (nextOpen.length < 2) return;

    locked.current = true;
    movesRef.current += 1;
    setMoves(movesRef.current);
    const [a, b] = nextOpen;
    const one = revealed.find((c) => c.card_id === a);
    const two = revealed.find((c) => c.card_id === b);
    if (one.pair_id === two.pair_id) {
      const matched = revealed.map((c) => c.card_id === a || c.card_id === b ? { ...c, matched: true } : c);
      cardsRef.current = matched;
      setCards(matched);
      open.current = [];
      locked.current = false;
      if (matched.every((c) => c.matched)) {
        setResult({ won: true, matched: matched.length / 2, moves: movesRef.current });
        setPhase('result');
      }
    } else {
      hide.current = setTimeout(() => {
        const concealed = cardsRef.current.map((c) => nextOpen.includes(c.card_id) ? { ...c, face_up: false } : c);
        cardsRef.current = concealed;
        setCards(concealed);
        open.current = [];
        locked.current = false;
      }, 900);
    }
  }

  function chooseNotes() {
    if (hide.current) clearTimeout(hide.current);
    open.current = [];
    locked.current = false;
    cardsRef.current = [];
    setCards([]);
    setNote(null);
    setPhase('choose');
  }

  const pairCount = note ? pairsFrom(note).length : 0;
  const found = cards.filter((c) => c.matched).length / 2;

  return <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={() => phase === 'choose' ? navigation.goBack() : chooseNotes()}>
        <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Memory Flip</Text>
        {note && <Text numberOfLines={1} style={styles.noteSub}>{titleOf(note)}</Text>}
      </View>
    </View>

    {phase === 'choose' && <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.panel}>
        <Text style={styles.hero}>Choose your study notes</Text>
        <Text style={styles.body}>Match each concept or example with its explanation. Cards are made from the notes you uploaded.</Text>
        {loading && <ActivityIndicator color={COLORS.primary} style={{ margin: 16 }} />}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!error && <TouchableOpacity style={styles.ghost} onPress={loadNotes}><Text style={styles.ghostText}>Try again</Text></TouchableOpacity>}
        {!loading && !error && notes.length === 0 && <Text style={styles.empty}>No uploaded notes yet. Upload a PDF in Learn Hub → Own notes, then return here.</Text>}
        {!loading && notes.map((item) => {
          const count = pairsFrom(item).length;
          return <TouchableOpacity key={item.id} disabled={count < 2} style={[styles.option, count < 2 && { opacity: 0.5 }]} onPress={() => startGame(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle} numberOfLines={2}>{titleOf(item)}</Text>
              <Text style={styles.meta}>{count >= 2 ? `${count} matching pairs` : 'Needs at least 2 concepts or examples'}</Text>
            </View>
            {count >= 2 && <Ionicons name="play-circle" size={28} color={COLORS.primary} />}
          </TouchableOpacity>;
        })}
      </View>
    </ScrollView>}

    {phase === 'playing' && <View style={styles.play}>
      <View style={styles.hud}>
        <Text style={styles.meta}>Pairs {found}/{pairCount}</Text><Text style={styles.meta}>Moves {moves}</Text><Text style={styles.meta}>{seconds}s</Text>
      </View>
      <Text style={styles.prompt}>Find each concept’s matching explanation.</Text>
      <View style={styles.grid}>{cards.map((c) =>
        <TouchableOpacity key={c.card_id} style={[styles.tile, !c.face_up && !c.matched && styles.hidden, c.matched && styles.matched]} disabled={locked.current || c.face_up || c.matched} onPress={() => flip(c.card_id)}>
          <Text style={[styles.tileText, !c.face_up && !c.matched && styles.mark]} numberOfLines={5}>{c.face_up || c.matched ? c.value : '?'}</Text>
        </TouchableOpacity>
      )}</View>
      <Text style={styles.footer}>Matching cards stay open. Unmatched cards flip back.</Text>
    </View>}

    {phase === 'result' && <View style={styles.panel}>
      <Text style={styles.celebrate}>{result?.won ? '🎉' : '⏱️'}</Text>
      <Text style={[styles.hero, !result?.won && { color: COLORS.error }]}>{result?.won ? 'All matched!' : "Time's up"}</Text>
      <Text style={styles.body}>{result?.won ? `You matched all ${result.matched} pairs in ${result.moves} moves.` : `You matched ${result?.matched || 0} of ${pairCount} pairs. Try again!`}</Text>
      <TouchableOpacity style={styles.primary} onPress={() => startGame(note)}><Text style={styles.primaryText}>Play Again</Text></TouchableOpacity>
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
  play: { flex: 1, justifyContent: 'center' },
  hud: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  prompt: { color: COLORS.textPrimary, fontSize: 15, textAlign: 'center', fontWeight: '700', marginBottom: 18 },
  grid: { alignSelf: 'center', width: WIDTH, flexDirection: 'row', flexWrap: 'wrap', gap: GAP, justifyContent: 'center' },
  tile: { width: SIZE, height: Math.min(SIZE, 120), borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', padding: 8, ...SHADOWS.small },
  hidden: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  matched: { backgroundColor: COLORS.successLight, borderColor: COLORS.success, opacity: 0.82 },
  tileText: { color: COLORS.textPrimary, textAlign: 'center', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  mark: { color: COLORS.white, fontSize: 30 },
  footer: { color: COLORS.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 16 },
  celebrate: { fontSize: 42, textAlign: 'center', marginBottom: 6 },
  primary: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  primaryText: { color: COLORS.white, fontWeight: '800' },
  ghost: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  ghostText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
});

