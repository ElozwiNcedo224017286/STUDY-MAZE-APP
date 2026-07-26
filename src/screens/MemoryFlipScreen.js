import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const EMOJIS = ['📐', '🧪', '📖', '🌍', '💰', '🎨', '🎵', '⚽'];
const GAME_TIME = 60;

function buildDeck() {
  const deck = [...EMOJIS, ...EMOJIS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export default function MemoryFlipScreen({ navigation }) {
  const { user, syncProgress } = useAuth();
  const [phase, setPhase] = useState('start'); // start | playing | result
  const [cards, setCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [resultData, setResultData] = useState(null);

  const flippedRef = useRef([]);
  const lockRef = useRef(false);
  const matchedRef = useRef(0);
  const timerRef = useRef(null);
  const coinsRef = useRef(user?.coins ?? 0);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startGame() {
    setCards(buildDeck());
    flippedRef.current = []; lockRef.current = false; matchedRef.current = 0;
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
    await syncProgress({ coins: coinsRef.current });
    setResultData({ won: true, bonus, moves, coins: coinsRef.current, timeLeft });
    setPhase('result');
  }

  async function loseGame() {
    await syncProgress({ coins: coinsRef.current });
    setResultData({ won: false, matched: matchedRef.current, coins: coinsRef.current });
    setPhase('result');
  }

  if (phase === 'start') {
    return (
      <View style={styles.flex}>
        <View style={styles.topnav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
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
      <View style={styles.flex}>
        <View style={styles.card}>
          <Text style={styles.icon}>{resultData.won ? '🎉' : '⏳'}</Text>
          <Text style={[styles.heroTitle, !resultData.won && styles.heroTitleLose]}>{resultData.won ? 'ALL MATCHED' : "TIME'S UP"}</Text>
          <Text style={styles.sub}>
            {resultData.won
              ? `Finished in ${resultData.moves} moves with ${resultData.timeLeft}s left. +${resultData.bonus} coins. Total: ${resultData.coins}`
              : `You matched ${resultData.matched}/${EMOJIS.length} pairs. Coins kept: ${resultData.coins}`}
          </Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhase('start')}><Text style={styles.btnSecondaryText}>Play Again</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Hub')}><Text style={styles.btnGhostText}>Back to Hub</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
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
});
