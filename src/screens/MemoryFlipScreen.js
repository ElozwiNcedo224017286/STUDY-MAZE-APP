import React, { useEffect, useRef, useState } from 'react';
<<<<<<< HEAD
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
=======
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
>>>>>>> origin/maze-updates
import { useAuth } from '../context/AuthContext';

const EMOJIS = ['📐', '🧪', '📖', '🌍', '💰', '🎨', '🎵', '⚽'];
const GAME_TIME = 60;
<<<<<<< HEAD
const GRID_COLS = 4;
const GRID_GAP = 8;
const GRID_SIDE_MARGIN = 4;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Bleed the grid almost to the screen edges so cards read as real game pieces, not a shrunken preview.
const CARD_SIZE = Math.floor((SCREEN_WIDTH - GRID_SIDE_MARGIN * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
=======
>>>>>>> origin/maze-updates

function buildDeck() {
  const deck = [...EMOJIS, ...EMOJIS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export default function MemoryFlipScreen({ navigation }) {
<<<<<<< HEAD
  const insets = useSafeAreaInsets();
=======
>>>>>>> origin/maze-updates
  const { recordGame } = useAuth();
  const [phase, setPhase] = useState('start'); // start | playing | result
  const [cards, setCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [resultData, setResultData] = useState(null);

  const flippedRef = useRef([]);
  const lockRef = useRef(false);
  const matchedRef = useRef(0);
  const timerRef = useRef(null);
  const coinsRef = useRef(0); // coins earned this game

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startGame() {
    setCards(buildDeck());
    flippedRef.current = []; lockRef.current = false; matchedRef.current = 0; coinsRef.current = 0;
    setMoves(0); setTimeLeft(GAME_TIME);
    setPhase('playing');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); loseGame(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function flip(id) {
    if (lockRef.current) return;
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      const updated = prev.map((c) => (c.id === id ? { ...c, flipped: true } : c));
      flippedRef.current = [...flippedRef.current, card];

      if (flippedRef.current.length === 2) {
        setMoves((m) => m + 1);
        lockRef.current = true;
        const [a, b] = flippedRef.current;
        if (a.emoji === b.emoji) {
          matchedRef.current += 1;
          flippedRef.current = [];
          lockRef.current = false;
          const matchedUpdate = updated.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c));
          if (matchedRef.current === EMOJIS.length) setTimeout(() => winGame(), 200);
          return matchedUpdate;
        } else {
          setTimeout(() => {
            setCards((cur) => cur.map((c) => (c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c)));
            flippedRef.current = [];
            lockRef.current = false;
          }, 700);
          return updated;
        }
      }
      return updated;
    });
  }

  async function winGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    const bonus = Math.max(20, Math.round(timeLeft * 1.5));
    coinsRef.current += bonus;
    await recordGame('memory_match', { coinsEarned: coinsRef.current, score: bonus });
    setResultData({ won: true, bonus, moves, coins: coinsRef.current, timeLeft });
    setPhase('result');
  }

  async function loseGame() {
    await recordGame('memory_match', { coinsEarned: coinsRef.current, score: 0 });
    setResultData({ won: false, matched: matchedRef.current, coins: coinsRef.current });
    setPhase('result');
  }

  if (phase === 'start') {
    return (
<<<<<<< HEAD
      <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topnav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
=======
      <View style={styles.flex}>
        <View style={styles.topnav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
>>>>>>> origin/maze-updates
          <Text style={styles.title}>Memory Flip</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heroTitle}>Match the Pairs</Text>
          <Bullet icon="🃏" text="Flip two cards to find matching subjects" />
          <Bullet icon="⏱️" text={`You have ${GAME_TIME} seconds on the clock`} />
          <Bullet icon="🪙" text="Finish in time to earn coins — the faster, the more" />
          <Bullet icon="⏳" text="Timer hits zero before you finish = you lose" />
          <TouchableOpacity style={styles.btn} onPress={startGame}><Text style={styles.btnText}>Start Game</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'result') {
    return (
<<<<<<< HEAD
      <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
        <View style={styles.card}>
          <Text style={styles.icon}>{resultData.won ? '🎉' : '⏳'}</Text>
          <Text style={[styles.heroTitle, !resultData.won && styles.heroTitleLose]}>{resultData.won ? 'All matched!' : "Time's up"}</Text>
=======
      <View style={styles.flex}>
        <View style={styles.card}>
          <Text style={styles.icon}>{resultData.won ? '🎉' : '⏳'}</Text>
          <Text style={[styles.heroTitle, !resultData.won && styles.heroTitleLose]}>{resultData.won ? 'ALL MATCHED' : "TIME'S UP"}</Text>
>>>>>>> origin/maze-updates
          <Text style={styles.sub}>
            {resultData.won
              ? `Finished in ${resultData.moves} moves with ${resultData.timeLeft}s left. +${resultData.bonus} coins. Total: ${resultData.coins}`
              : `You matched ${resultData.matched}/${EMOJIS.length} pairs. Coins kept: ${resultData.coins}`}
          </Text>
<<<<<<< HEAD
          <TouchableOpacity style={styles.btn} onPress={() => setPhase('start')}><Text style={styles.btnText}>Play Again</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Main')}><Text style={styles.btnGhostText}>Back to Home</Text></TouchableOpacity>
=======
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhase('start')}><Text style={styles.btnSecondaryText}>Play Again</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Hub')}><Text style={styles.btnGhostText}>Back to Hub</Text></TouchableOpacity>
>>>>>>> origin/maze-updates
        </View>
      </View>
    );
  }

  return (
<<<<<<< HEAD
    <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { if (timerRef.current) clearInterval(timerRef.current); navigation.goBack(); }}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Memory Flip</Text>
      </View>
      <View style={styles.playArea}>
        <View style={styles.hudRow}>
          <Text style={styles.infoText}>Moves: {moves}</Text>
          <Text style={styles.infoText}>{timeLeft}s</Text>
        </View>
        <View style={styles.gridWrap}>
          <View style={styles.grid}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[styles.mcard, card.matched && styles.mcardMatched, !card.flipped && !card.matched && styles.mcardHidden]}
                onPress={() => flip(card.id)}
              >
                <Text style={styles.mcardText}>{card.flipped || card.matched ? card.emoji : '❓'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
=======
    <View style={styles.flex}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { if (timerRef.current) clearInterval(timerRef.current); navigation.goBack(); }}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memory Flip</Text>
      </View>
      <View style={styles.hudRow}>
        <Text style={styles.infoText}>Moves: {moves}</Text>
        <Text style={styles.infoText}>{timeLeft}s</Text>
      </View>
      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[styles.mcard, card.matched && styles.mcardMatched, !card.flipped && !card.matched && styles.mcardHidden]}
            onPress={() => flip(card.id)}
          >
            <Text style={styles.mcardText}>{card.flipped || card.matched ? card.emoji : '❓'}</Text>
          </TouchableOpacity>
        ))}
>>>>>>> origin/maze-updates
      </View>
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
<<<<<<< HEAD
  flex: { flex: 1, backgroundColor: COLORS.backgroundSecondary, paddingHorizontal: 20 },
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
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 22, ...SHADOWS.small },
  heroTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 19, marginBottom: 14, textAlign: 'center' },
  heroTitleLose: { color: COLORS.error },
  icon: { fontSize: 42, textAlign: 'center', marginBottom: 6 },
  sub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  bulletIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  bulletText: { color: COLORS.textPrimary, fontSize: 14, flex: 1 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 10, ...SHADOWS.small },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  btnGhost: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  playArea: { flex: 1, justifyContent: 'center' },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  infoText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  gridWrap: { marginHorizontal: -20, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, justifyContent: 'center', width: SCREEN_WIDTH - GRID_SIDE_MARGIN * 2 },
  mcard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  mcardHidden: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mcardMatched: { backgroundColor: COLORS.successLight, borderColor: COLORS.success, opacity: 0.75 },
  mcardText: { fontSize: Math.round(CARD_SIZE * 0.42) },
=======
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
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoText: { color: colors.inkDim, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  mcard: { width: '22%', aspectRatio: 1, borderRadius: 10, backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  mcardHidden: { backgroundColor: colors.wall, borderColor: colors.wallEdge },
  mcardMatched: { backgroundColor: 'rgba(6,255,165,0.15)', borderColor: colors.mint, opacity: 0.7 },
  mcardText: { fontSize: 22 }
>>>>>>> origin/maze-updates
});
