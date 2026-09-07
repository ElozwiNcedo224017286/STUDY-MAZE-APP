import React, { useEffect, useRef, useState, useReducer, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { LEVELS } from './mazeData';
import { buildActivePool } from './quizBank';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FLEX_PADDING = 12;
const MAZE_WRAP_PADDING = 6;

export default function MazeGameScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { levelIndex } = route.params;
  const level = LEVELS[levelIndex];
  const { recordGame } = useAuth();

  const gridRef = useRef(level.grid.map((row) => row.split('').map(Number)));
  const ROWS = gridRef.current.length;
  const COLS = gridRef.current[0].length;
  // Fill as much of the screen width as possible so the maze doesn't feel tiny on any device.
  const CELL = Math.floor((SCREEN_WIDTH - FLEX_PADDING * 2 - MAZE_WRAP_PADDING * 2) / COLS);
  // Cells are a bit taller than they are wide, so the maze reads bigger vertically too.
  const CELL_H = Math.round(CELL * 1.18);
  const playerRef = useRef({ r: 1, c: 1 });
  const ghostsRef = useRef(level.ghostStarts.map((g) => ({ ...g })));
  const dotsRemainingRef = useRef(gridRef.current.flat().filter((v) => v === 0).length);
  const awaitingQuizRef = useRef(false);
  const quizPoolRef = useRef([]);
  const currentQuizCellRef = useRef(null);
  const coinsRef = useRef(0); // coins EARNED this run — added to the player's total on finish
  const runningRef = useRef(true);

  const [, forceRender] = useReducer((x) => x + 1, 0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [paused, setPaused] = useState(false);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');

  const totalDots = level.grid.reduce((s, row) => s + row.split('').filter((ch) => ch === '0').length, 0);
  const totalQuizNodes = level.grid.reduce((s, row) => s + row.split('').filter((ch) => ch === '2').length, 0);
  const dotsCollected = totalDots - dotsRemainingRef.current;

  // Load the active question pool (built-in + any teacher-published set) once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { questions } = await api.getQuizBank();
        if (alive) quizPoolRef.current = shuffle(buildActivePool(questions));
      } catch (e) {
        if (alive) quizPoolRef.current = shuffle(buildActivePool([]));
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const ghostTimer = setInterval(() => {
      if (!runningRef.current || awaitingQuizRef.current) return;
      moveGhosts();
      checkGhostCollision();
      forceRender();
    }, 480);
    return () => clearInterval(ghostTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function nextQuestion() {
    if (quizPoolRef.current.length === 0) quizPoolRef.current = shuffle(buildActivePool([]));
    return quizPoolRef.current.pop();
  }

  function moveGhosts() {
    ghostsRef.current.forEach((g) => {
      const p = playerRef.current;
      const dr = Math.sign(p.r - g.r);
      const dc = Math.sign(p.c - g.c);
      const candidates = [];
      if (dr !== 0) candidates.push([dr, 0]);
      if (dc !== 0) candidates.push([0, dc]);
      candidates.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [mr, mc] of candidates) {
        const nr = g.r + mr, nc = g.c + mc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && gridRef.current[nr][nc] !== 1) {
          g.r = nr; g.c = nc; break;
        }
      }
    });
  }

  function checkGhostCollision() {
    if (!runningRef.current) return;
    const p = playerRef.current;
    if (ghostsRef.current.some((g) => g.r === p.r && g.c === p.c)) loseLife();
  }

  function togglePause() {
    setPaused((prev) => {
      const next = !prev;
      runningRef.current = !next;
      return next;
    });
  }

  function loseLife() {
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        runningRef.current = false;
        gameOver();
      } else {
        runningRef.current = false;
        setTimeout(() => {
          playerRef.current = { r: 1, c: 1 };
          ghostsRef.current = level.ghostStarts.map((g) => ({ ...g }));
          runningRef.current = true;
          forceRender();
        }, 500);
      }
      return next;
    });
  }

  async function gameOver() {
    // Loss: record coins earned + score, but no level (so the unlock doesn't advance).
    await recordGame('quiz_maze', { coinsEarned: coinsRef.current, score });
    navigation.replace('MazeResult', { outcome: 'lose', coins: coinsRef.current, score, levelIndex });
  }

  async function checkWin() {
    if (dotsRemainingRef.current <= 0) {
      runningRef.current = false;
      // Win: record the completed level so game_scores drives the unlocked-level total.
      await recordGame('quiz_maze', { coinsEarned: coinsRef.current, score, level: level.id });
      navigation.replace('MazeResult', { outcome: 'win', coins: coinsRef.current, score, levelIndex });
    }
  }

  function tryMove(dr, dc) {
    if (!runningRef.current || awaitingQuizRef.current) return;
    const p = playerRef.current;
    const nr = p.r + dr, nc = p.c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (gridRef.current[nr][nc] === 1) return;
    playerRef.current = { r: nr, c: nc };
    const cell = gridRef.current[nr][nc];
    if (cell === 0) {
      gridRef.current[nr][nc] = 3;
      dotsRemainingRef.current -= 1;
      setScore((s) => s + 10);
    } else if (cell === 2) {
      currentQuizCellRef.current = { r: nr, c: nc };
      openQuiz();
    }
    forceRender();
    checkGhostCollision();
    checkWin();
  }

  function openQuiz() {
    awaitingQuizRef.current = true;
    setQuizFeedback('');
    setQuizQuestion(nextQuestion());
    setQuizVisible(true);
  }

  function answerQuiz(i) {
    if (!quizQuestion) return;
    if (i === quizQuestion.correct) {
      coinsRef.current += 30;
      setQuizFeedback('✔ Correct! +30 coins');
    } else {
      coinsRef.current = Math.max(0, coinsRef.current - 10);
      setQuizFeedback(`✘ Not quite — the answer was "${quizQuestion.opts[quizQuestion.correct]}"`);
    }
    setCoins(coinsRef.current);
    setTimeout(() => {
      setQuizVisible(false);
      awaitingQuizRef.current = false;
      const cell = currentQuizCellRef.current;
      if (cell) { gridRef.current[cell.r][cell.c] = 3; currentQuizCellRef.current = null; }
      forceRender();
      checkGhostCollision();
      checkWin();
    }, 1100);
  }

  const grid = gridRef.current;
  const player = playerRef.current;
  const ghosts = ghostsRef.current;

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { runningRef.current = false; navigation.goBack(); }}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{level.name}</Text>
      </View>

      <View style={styles.hudRow}>
        <View style={styles.lives}>
          {[0, 1, 2].map((i) => <Text key={i} style={[styles.heart, i >= lives && styles.heartDead]}>❤️</Text>)}
        </View>
        <View style={styles.starPill}>
          <Ionicons name="star" size={14} color={COLORS.accent} />
          <Text style={styles.starPillText}>{dotsCollected} / {totalDots}</Text>
        </View>
        <View style={styles.coinPill}>
          <Text style={styles.coinPillCoin}>🪙</Text>
          <Text style={styles.coinPillText}>{coins}</Text>
        </View>
      </View>

      <View style={[styles.mazeWrap, { width: COLS * CELL + MAZE_WRAP_PADDING * 2, height: ROWS * CELL_H + MAZE_WRAP_PADDING * 2 }]}>
        <View style={{ width: COLS * CELL, height: ROWS * CELL_H, position: 'relative' }}>
          {grid.map((row, r) => row.map((v, c) => {
            if (v === 1) return <View key={`${r}-${c}`} style={[styles.cellWall, cellPos(r, c, CELL, CELL_H)]} />;
            if (v === 0) return <View key={`${r}-${c}`} style={[styles.cellDotWrap, cellPos(r, c, CELL, CELL_H)]}><View style={styles.dot} /></View>;
            if (v === 2) return <View key={`${r}-${c}`} style={[styles.cellQuizWrap, cellPos(r, c, CELL, CELL_H)]}><View style={styles.quizNode}><Text style={styles.quizMark}>?</Text></View></View>;
            return <View key={`${r}-${c}`} style={cellPos(r, c, CELL, CELL_H)} />;
          }))}
          {ghosts.map((g, i) => (
            <Image key={i} source={require('../../assets/Artwork/maze-ghost-cute.png')} style={[{ width: CELL + 10, height: CELL + 10 }, cellPos(g.r, g.c, CELL, CELL_H)]} resizeMode="contain" />
          ))}
          <Image source={require('../../assets/Artwork/maze-player-graduate.png')} style={[{ width: CELL + 14, height: CELL + 14 }, cellPos(player.r, player.c, CELL, CELL_H)]} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <View style={styles.ctrlSpacer} />
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(-1, 0)}><Ionicons name="caret-up" size={26} color={COLORS.primary} /></TouchableOpacity>
          <View style={styles.ctrlSpacer} />
        </View>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(0, -1)}><Ionicons name="caret-back" size={26} color={COLORS.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
            <Ionicons name={paused ? 'play' : 'pause'} size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(0, 1)}><Ionicons name="caret-forward" size={26} color={COLORS.primary} /></TouchableOpacity>
        </View>
        <View style={styles.controlsRow}>
          <View style={styles.ctrlSpacer} />
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(1, 0)}><Ionicons name="caret-down" size={26} color={COLORS.primary} /></TouchableOpacity>
          <View style={styles.ctrlSpacer} />
        </View>
      </View>

      <View style={styles.goalCard}>
        <View style={{ flex: 1 }}>
          <View style={styles.goalRow}>
            <Ionicons name="star" size={14} color={COLORS.accent} />
            <Text style={styles.goalText}>Collect all {totalDots} points</Text>
          </View>
          <View style={styles.goalRow}>
            <View style={styles.goalQuizDot}><Text style={styles.goalQuizMark}>?</Text></View>
            <Text style={styles.goalText}>Answer {totalQuizNodes} question{totalQuizNodes === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalGhostEmoji}>👻</Text>
            <Text style={styles.goalText}>Avoid the ghosts</Text>
          </View>
        </View>
        <Image source={require('../../assets/Artwork/maze-goal-checklist.png')} style={styles.goalImage} resizeMode="contain" />
      </View>

      {paused && (
        <View style={styles.pausedOverlay} pointerEvents="none">
          <Text style={styles.pausedText}>Paused</Text>
        </View>
      )}

      <Modal visible={quizVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.quizCard}>
            {quizQuestion && (
              <>
                <Text style={styles.quizTag}>{quizQuestion.subject}</Text>
                <Text style={styles.quizQ}>{quizQuestion.q}</Text>
                {quizQuestion.opts.map((opt, i) => (
                  <TouchableOpacity key={i} style={styles.quizOpt} onPress={() => answerQuiz(i)} disabled={!!quizFeedback}>
                    <Text style={styles.quizOptText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
                {!!quizFeedback && <Text style={styles.quizFeedback}>{quizFeedback}</Text>}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function cellPos(r, c, CELL, CELL_H) {
  return { position: 'absolute', left: c * CELL, top: r * CELL_H, width: CELL, height: CELL_H, alignItems: 'center', justifyContent: 'center' };
}

const QUIZ_ORANGE = '#F97316';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.backgroundSecondary, padding: FLEX_PADDING },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  title: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 15 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 },
  lives: { flexDirection: 'row', gap: 3 },
  heart: { fontSize: 15 },
  heartDead: { opacity: 0.25 },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  starPillText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  coinPillCoin: { fontSize: 13 },
  coinPillText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 13 },
  mazeWrap: {
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: MAZE_WRAP_PADDING,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  cellWall: { backgroundColor: COLORS.primary, borderRadius: 3, margin: 1 },
  cellDotWrap: {},
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  cellQuizWrap: {},
  quizNode: { width: 15, height: 15, borderRadius: 8, backgroundColor: QUIZ_ORANGE, alignItems: 'center', justifyContent: 'center' },
  quizMark: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  controls: { alignItems: 'center', gap: 8, marginBottom: 16 },
  controlsRow: { flexDirection: 'row', gap: 10 },
  ctrlSpacer: { width: 66, height: 60 },
  ctrlBtn: {
    width: 66,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  pauseBtn: {
    width: 66,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    ...SHADOWS.small,
  },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  goalText: { color: COLORS.textPrimary, fontSize: 12.5, fontWeight: '600' },
  goalQuizDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: QUIZ_ORANGE, alignItems: 'center', justifyContent: 'center' },
  goalQuizMark: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  goalGhostEmoji: { fontSize: 14, width: 16, textAlign: 'center' },
  goalImage: { width: 56, height: 56 },
  pausedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(26,16,48,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedText: { color: COLORS.white, fontWeight: '900', fontSize: 22, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,16,48,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  quizCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 22, width: '100%', maxWidth: 340, ...SHADOWS.large },
  quizTag: { color: QUIZ_ORANGE, fontSize: 11, letterSpacing: 1, marginBottom: 10, fontWeight: '800' },
  quizQ: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 21, marginBottom: 14, fontWeight: '600' },
  quizOpt: { backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 9 },
  quizOptText: { color: COLORS.textPrimary, fontSize: 14 },
  quizFeedback: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },
});
