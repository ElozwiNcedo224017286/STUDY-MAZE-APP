import React, { useEffect, useRef, useState, useReducer, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { LEVELS } from './mazeData';
import { buildActivePool } from './quizBank';

const CELL = 22;

export default function MazeGameScreen({ route, navigation }) {
  const { levelIndex } = route.params;
  const level = LEVELS[levelIndex];
  const { user, syncProgress } = useAuth();

  const gridRef = useRef(level.grid.map((row) => row.split('').map(Number)));
  const ROWS = gridRef.current.length;
  const COLS = gridRef.current[0].length;
  const playerRef = useRef({ r: 1, c: 1 });
  const ghostsRef = useRef(level.ghostStarts.map((g) => ({ ...g })));
  const dotsRemainingRef = useRef(gridRef.current.flat().filter((v) => v === 0).length);
  const awaitingQuizRef = useRef(false);
  const quizPoolRef = useRef([]);
  const currentQuizCellRef = useRef(null);
  const coinsRef = useRef(user?.coins ?? 0);
  const runningRef = useRef(true);

  const [, forceRender] = useReducer((x) => x + 1, 0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');

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
    await syncProgress({ coins: coinsRef.current });
    navigation.replace('MazeResult', { outcome: 'lose', coins: coinsRef.current, score, levelIndex });
  }

  async function checkWin() {
    if (dotsRemainingRef.current <= 0) {
      runningRef.current = false;
      const isLast = levelIndex >= LEVELS.length - 1;
      const nextUnlocked = Math.max(user.unlockedLevel || 1, isLast ? LEVELS.length : level.id + 1);
      await syncProgress({ coins: coinsRef.current, unlockedLevel: nextUnlocked, highScore: Math.max(user.highScore || 0, score) });
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
    <View style={styles.flex}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { runningRef.current = false; navigation.goBack(); }}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{level.name}</Text>
      </View>

      <View style={styles.hudRow}>
        <View style={styles.lives}>
          {[0, 1, 2].map((i) => <Text key={i} style={[styles.heart, i >= lives && styles.heartDead]}>❤️</Text>)}
        </View>
        <Text style={styles.scoreText}>{score}</Text>
      </View>

      <View style={[styles.mazeWrap, { width: COLS * CELL + 16, height: ROWS * CELL + 16 }]}>
        <View style={{ width: COLS * CELL, height: ROWS * CELL, position: 'relative' }}>
          {grid.map((row, r) => row.map((v, c) => {
            if (v === 1) return <View key={`${r}-${c}`} style={[styles.cellWall, cellPos(r, c)]} />;
            if (v === 0) return <View key={`${r}-${c}`} style={[styles.cellDotWrap, cellPos(r, c)]}><View style={styles.dot} /></View>;
            if (v === 2) return <View key={`${r}-${c}`} style={[styles.cellQuizWrap, cellPos(r, c)]}><View style={styles.quizNode}><Text style={styles.quizMark}>?</Text></View></View>;
            return <View key={`${r}-${c}`} style={cellPos(r, c)} />;
          }))}
          {ghosts.map((g, i) => (
            <Text key={i} style={[styles.emojiOverlay, cellPos(g.r, g.c)]}>👻</Text>
          ))}
          <View style={[styles.player, cellPos(player.r, player.c)]} />
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(-1, 0)}><Text style={styles.ctrlText}>▲</Text></TouchableOpacity>
        </View>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(0, -1)}><Text style={styles.ctrlText}>◀</Text></TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(1, 0)}><Text style={styles.ctrlText}>▼</Text></TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => tryMove(0, 1)}><Text style={styles.ctrlText}>▶</Text></TouchableOpacity>
        </View>
      </View>
      <Text style={styles.hint}>Gold = points · coral = quiz · avoid the ghosts 👻</Text>

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

function cellPos(r, c) {
  return { position: 'absolute', left: c * CELL, top: r * CELL, width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' };
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: 50 },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: colors.ink, fontSize: 18 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lives: { flexDirection: 'row', gap: 3 },
  heart: { fontSize: 15 },
  heartDead: { opacity: 0.25 },
  scoreText: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  mazeWrap: { alignSelf: 'center', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 14, padding: 8, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  cellWall: { backgroundColor: colors.wall, borderWidth: 1, borderColor: 'rgba(157,78,221,0.6)' },
  cellDotWrap: {},
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold },
  cellQuizWrap: {},
  quizNode: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  quizMark: { color: colors.bg, fontSize: 9, fontWeight: '900' },
  emojiOverlay: { fontSize: 16 },
  player: { width: CELL - 8, height: CELL - 8, borderRadius: (CELL - 8) / 2, backgroundColor: colors.mint },
  controls: { alignItems: 'center', gap: 6, marginBottom: 6 },
  controlsRow: { flexDirection: 'row', gap: 6 },
  ctrlBtn: { width: 48, height: 44, borderRadius: 10, backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  ctrlText: { color: colors.ink, fontSize: 16 },
  hint: { color: colors.inkDim, fontSize: 10.5, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,4,24,0.8)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  quizCard: { backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.coral, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 },
  quizTag: { color: colors.coral, fontSize: 10, letterSpacing: 1, marginBottom: 10, fontWeight: '800' },
  quizQ: { color: colors.ink, fontSize: 15, lineHeight: 21, marginBottom: 14 },
  quizOpt: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, padding: 11, marginBottom: 8 },
  quizOptText: { color: colors.ink, fontSize: 13 },
  quizFeedback: { color: colors.inkDim, fontSize: 12.5, marginTop: 6 }
});
