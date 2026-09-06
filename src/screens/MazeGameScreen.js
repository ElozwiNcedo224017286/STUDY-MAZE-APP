<<<<<<< HEAD
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
=======

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AppState,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

import {
  SUBJECTS,
  DIFFICULTIES,
  getRandomMaze,
  prepareMazeMap,
} from './mazeData';

import {
  buildActiveQuestionPool,
} from './quizBank';


/* ==========================================================
   GRID LEGEND

   1 = wall
   0 = coin
   2 = quiz
   3 = visited
========================================================== */

const WALL = 1;
const COIN = 0;
const QUIZ = 2;
const VISITED = 3;


/* ==========================================================
   DIRECTIONS
========================================================== */

const DIRECTIONS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};


/* ==========================================================
   COMPONENT
========================================================== */

export default function MazeGameScreen({
  route,
  navigation,
}) {

  const {
    subject = 'science',
    difficulty = 'easy',
  } = route.params || {};


  /* ========================================================
     SUBJECT abd DIFFICULTY
  ======================================================== */

  const subjectInfo =
    SUBJECTS.find(item => item.id === subject) || SUBJECTS[0];

  const difficultyInfo =
    DIFFICULTIES.find(item => item.id === difficulty) || DIFFICULTIES[0];


  const { recordGame } = useAuth();


  /* ========================================================
     SCREEN SIZE
  ======================================================== */

  const {
    width,
    height,
  } = useWindowDimensions();


  /* ========================================================
     PREDEFINED MAPS

     One map is randomly selected from the predefined
     difficulty pool.
  ======================================================== */

  const mazeRef = useRef(null);

  if (!mazeRef.current) {
    const selectedMap =
      getRandomMaze(
        difficulty
      );

    mazeRef.current =
      prepareMazeMap(
        selectedMap
      );
  }


  /* ========================================================
     GRID
  ======================================================== */

  const gridRef = useRef(
    mazeRef.current.grid.map(
      row => [...row]
    )
  );


  /* ========================================================
     INITIAL PLAYER
  ======================================================== */

  const initialPlayer =
    mazeRef.current.playerStart ||
    {
      r: 1,
      c: 1,
    };

  const playerRef = useRef({
    ...initialPlayer,
  });


  /* ========================================================
     INITIAL GHOSTS
  ======================================================== */

  const initialGhosts =
    mazeRef.current.ghostStarts ||
    [];

  const ghostsRef =
    useRef(
      initialGhosts.map(
        ghost => ({
          ...ghost,
        })
      )
    );


  /* ========================================================
     GAME References
  ======================================================== */

  const livesRef =
    useRef(3);

  const scoreRef =
    useRef(0);

  const coinsRef =
    useRef(0);

  const runningRef =
    useRef(true);

  const gameFinishedRef =
    useRef(false);

  const awaitingQuizRef =
    useRef(false);

  const currentQuizCellRef =
    useRef(null);

  const quizPoolRef =
    useRef([]);


  /* ========================================================
     COUNT COINS
  ======================================================== */

  const totalCoins =
    useMemo(
      () =>
        gridRef.current
          .flat()
          .filter(
            value =>
              value === COIN
          )
          .length,
      []
    );


  const coinsRemainingRef =
    useRef(totalCoins);


  /* ========================================================
     COUNT QUIZ NODES
  ======================================================== */

  const totalQuizNodes =
    mazeRef.current
      .quizCells?.length || 0;

  const quizRemainingRef =
    useRef(totalQuizNodes);


  /* ========================================================
     REACT STATE
  ======================================================== */

  const [, forceRender] =
    useState(0);

  const [lives, setLives] =
    useState(3);

  const [score, setScore] =
    useState(0);

  const [coins, setCoins] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const [quizVisible, setQuizVisible] =
    useState(false);

  const [quizQuestion, setQuizQuestion] =
    useState(null);

  const [quizFeedback, setQuizFeedback] =
    useState('');

  const [gameFinished, setGameFinished] =
    useState(false);


  /* ========================================================
     MAZE DIMENSIONS
  ======================================================== */

  const grid =
    gridRef.current;

  const ROWS =
    grid.length;

  const COLS =
    grid[0]?.length || 1;


  const availableWidth =
    Math.min(
      width - 36,
      420
    );

  const availableHeight =
    Math.min(
      height * 0.46,
      520
    );


  const cellSize =
    Math.max(
      12,
      Math.min(
        24,
        Math.floor(
          Math.min(
            availableWidth /
              COLS,
            availableHeight /
              ROWS
          )
        )
      )
    );


  const mazeWidth =
    COLS * cellSize;

  const mazeHeight =
    ROWS * cellSize;


  /* ========================================================
     REFRESH
  ======================================================== */

  const refresh =
    useCallback(() => {
      forceRender(
        value => value + 1
      );
    }, []);


  /* ========================================================
     LOAD QUIZ BANK
  ======================================================== */

  useEffect(() => {

    let alive = true;

    async function loadQuestions() {

      try {

        const result =
          await api.getQuizBank();

        const questions =
          result?.questions || [];

        if (!alive) {
          return;
        }

        quizPoolRef.current =
          buildActiveQuestionPool(
            questions,
            subjectInfo.shortName,
            difficulty
          );

      } catch (error) {

        console.log(
          'Could not load quiz bank:',
          error
        );

        if (!alive) {
          return;
        }

        /*
         * Falls back to the local quiz bank.
         */
        quizPoolRef.current =
          buildActiveQuestionPool(
            [],
            subjectInfo.shortName,
            difficulty
          );
      }
    }

    loadQuestions();

    return () => {
      alive = false;
    };

  }, [
    subjectInfo.shortName,
    difficulty,
  ]);


  /* ========================================================
     GET NEXT QUESTION
  ======================================================== */

  const nextQuestion =
    useCallback(() => {

      if (
        quizPoolRef.current.length === 0
      ) {

        quizPoolRef.current =
          buildActiveQuestionPool(
            [],
            subjectInfo.shortName,
            difficulty
          );
      }


      if (
        quizPoolRef.current.length === 0
      ) {
        return null;
      }


      /*
        Random question from the matching subject
        and difficulty.
       */
      const index =
        Math.floor(
          Math.random() *
            quizPoolRef.current.length
        );

      return quizPoolRef.current.splice(
        index,
        1
      )[0];

    }, [
      subjectInfo.shortName,
      difficulty,
    ]);


  /* ========================================================
     OPEN QUESTION
  ======================================================== */

  const openQuiz =
    useCallback(
      cell => {

        if (
          awaitingQuizRef.current ||
          quizVisible ||
          gameFinishedRef.current
        ) {
          return;
        }


        const question =
          nextQuestion();


        if (!question) {

          console.warn(
            'No question available for:',
            subjectInfo.shortName,
            difficulty
          );

          return;
        }


        currentQuizCellRef.current =
          cell;

        awaitingQuizRef.current =
          true;


        setQuizQuestion(
          question
        );

        setQuizFeedback('');

        setQuizVisible(true);

      },
      [
        quizVisible,
        nextQuestion,
        subjectInfo.shortName,
        difficulty,
      ]
    );


  /* ========================================================
     FINISH GAME
  ======================================================== */

  const finishGame =
    useCallback(
      async outcome => {

        if (
          gameFinishedRef.current
        ) {
          return;
        }


        gameFinishedRef.current =
          true;

        runningRef.current =
          false;

        setGameFinished(true);


        try {

          await recordGame(
            'quiz_maze',
            {
              subject,
              difficulty,

              score:
                scoreRef.current,

              coins:
                coinsRef.current,

              coinsCollected:
                totalCoins -
                coinsRemainingRef.current,

              questionsAnswered:
                totalQuizNodes -
                quizRemainingRef.current,
            }
          );

        } catch (error) {

          console.log(
            'Could not record maze game:',
            error
          );
        }


        navigation.replace(
          'MazeResult',
          {
            outcome,

            score:
              scoreRef.current,

            coins:
              coinsRef.current,

            subject,
            difficulty,
          }
        );

      },
      [
        recordGame,
        navigation,
        subject,
        difficulty,
        totalCoins,
        totalQuizNodes,
      ]
    );


  /* ========================================================
     CHECK WIN
  ======================================================== */

  const checkWin =
    useCallback(() => {

      if (
        gameFinishedRef.current
      ) {
        return;
      }


      /*
       * Player must collect EVERY coin
       * AND answer EVERY question.
       */
      if (
        coinsRemainingRef.current <= 0 &&
        quizRemainingRef.current <= 0 &&
        !quizVisible &&
        !awaitingQuizRef.current
      ) {

        finishGame(
          'win'
        );
      }

    }, [
      quizVisible,
      finishGame,
    ]);


  /* ========================================================
     GHOST MOVEMENT
  ======================================================== */

  const moveGhosts =
    useCallback(() => {

      if (
        !runningRef.current ||
        paused ||
        quizVisible
      ) {
        return;
      }


      const player =
        playerRef.current;


      ghostsRef.current.forEach(
        ghost => {

          const possibleMoves = [
            ...Object.values(
              DIRECTIONS
            ),
          ];


          /*
           * Occasionally try to move toward player.
           */
          possibleMoves.sort(
            (a, b) => {

              const aR =
                ghost.r + a[0];

              const aC =
                ghost.c + a[1];

              const bR =
                ghost.r + b[0];

              const bC =
                ghost.c + b[1];


              const aDistance =
                Math.abs(
                  player.r - aR
                ) +
                Math.abs(
                  player.c - aC
                );


              const bDistance =
                Math.abs(
                  player.r - bR
                ) +
                Math.abs(
                  player.c - bC
                );


              return (
                aDistance -
                bDistance
              );
            }
          );


          /*
           * Add randomness so ghosts do not always
           * take exactly the same route.
           */
          if (
            Math.random() < 0.35
          ) {

            possibleMoves.sort(
              () =>
                Math.random() -
                0.5
            );
          }


          for (
            const [
              dr,
              dc,
            ] of possibleMoves
          ) {

            const nr =
              ghost.r + dr;

            const nc =
              ghost.c + dc;


            if (
              nr < 0 ||
              nr >= ROWS ||
              nc < 0 ||
              nc >= COLS
            ) {
              continue;
            }


            if (
              gridRef.current[
                nr
              ][nc] === WALL
            ) {
              continue;
            }


            ghost.r = nr;
            ghost.c = nc;

            break;
          }

        }
      );

    }, [
      paused,
      quizVisible,
      ROWS,
      COLS,
    ]);


  /* ========================================================
     GHOST COLLISION
  ======================================================== */

  const checkGhostCollision =
    useCallback(() => {

      const player =
        playerRef.current;


      const collision =
        ghostsRef.current.some(
          ghost =>
            ghost.r === player.r &&
            ghost.c === player.c
        );


      if (collision) {

        loseLife();
      }

    }, []);


  /* ========================================================
     LOSE LIFE

     Declared as a function expression using a ref so the
     collision function can safely call it.
  ======================================================== */

  function loseLife() {

    if (
      !runningRef.current ||
      gameFinishedRef.current
    ) {
      return;
    }


    const nextLives =
      livesRef.current - 1;


    livesRef.current =
      nextLives;

    setLives(
      nextLives
    );


    if (
      nextLives <= 0
    ) {

      finishGame(
        'lose'
      );

      return;
    }


    /*
     * Temporarily stop movement.
     */
    runningRef.current =
      false;


    setTimeout(() => {

      if (
        gameFinishedRef.current
      ) {
        return;
      }


      playerRef.current =
        {
          ...initialPlayer,
        };


      ghostsRef.current =
        initialGhosts.map(
          ghost => ({
            ...ghost,
          })
        );


      runningRef.current =
        true;


      refresh();

    }, 700);
  }


  /* ========================================================
     MOVE PLAYER
  ======================================================== */

  const tryMove =
    useCallback(
      (dr, dc) => {

        if (
          !runningRef.current ||
          paused ||
          quizVisible ||
          awaitingQuizRef.current ||
          gameFinishedRef.current
        ) {
          return;
        }


        const player =
          playerRef.current;


        const nextR =
          player.r + dr;

        const nextC =
          player.c + dc;


        if (
          nextR < 0 ||
          nextR >= ROWS ||
          nextC < 0 ||
          nextC >= COLS
        ) {
          return;
        }


        /*
         * WALL
         */
        if (
          gridRef.current[
            nextR
          ][nextC] === WALL
        ) {
          return;
        }


        /*
         * Move player.
         */
        playerRef.current =
          {
            r: nextR,
            c: nextC,
          };


        const cell =
          gridRef.current[
            nextR
          ][nextC];


        /* ==================================================
           COLLECT COIN
        ================================================== */

        if (
          cell === COIN
        ) {

          gridRef.current[
            nextR
          ][nextC] =
            VISITED;


          coinsRemainingRef.current =
            Math.max(
              0,
              coinsRemainingRef.current -
                1
            );


          coinsRef.current +=
            difficultyInfo.coinValue;


          scoreRef.current +=
            10;


          setCoins(
            coinsRef.current
          );

          setScore(
            scoreRef.current
          );
        }


        /* ==================================================
           QUIZ NODE
        ================================================== */

        else if (
          cell === QUIZ
        ) {

          openQuiz({
            r: nextR,
            c: nextC,
          });
        }


        /* ==================================================
           GHOST COLLISION
        ================================================== */

        checkGhostCollision();


        refresh();


        /*
         * Delay win check slightly so that the quiz modal
         * state has time to update.
         */
        setTimeout(
          checkWin,
          30
        );

      },
      [
        paused,
        quizVisible,
        ROWS,
        COLS,
        difficultyInfo.coinValue,
        openQuiz,
        checkGhostCollision,
        refresh,
        checkWin,
      ]
    );


  /* ========================================================
     KEYBOARD CONTROLS

     React Native Web / desktop keyboard support.
  ======================================================== */

  useEffect(() => {

    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }


    const handleKeyDown =
      event => {

        switch (
          event.key
            .toLowerCase()
        ) {

          case 'arrowup':
          case 'w':
            event.preventDefault();
            tryMove(-1, 0);
            break;


          case 'arrowdown':
          case 's':
            event.preventDefault();
            tryMove(1, 0);
            break;


          case 'arrowleft':
          case 'a':
            event.preventDefault();
            tryMove(0, -1);
            break;


          case 'arrowright':
          case 'd':
            event.preventDefault();
            tryMove(0, 1);
            break;


          case 'p':
          case 'escape':

            if (
              !quizVisible &&
              !gameFinished
            ) {
              setPaused(
                current =>
                  !current
              );
            }

            break;


          default:
            break;
        }
      };


    window.addEventListener(
      'keydown',
      handleKeyDown
    );


    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };

  }, [
    tryMove,
    quizVisible,
    gameFinished,
  ]);


  /* ========================================================
     GHOST TIMER
  ======================================================== */

  useEffect(() => {

    if (
      paused ||
      quizVisible ||
      gameFinished
    ) {
      return undefined;
    }


    const timer =
      setInterval(() => {

        moveGhosts();

        checkGhostCollision();

        refresh();

      }, difficultyInfo.ghostSpeed);


    return () =>
      clearInterval(
        timer
      );

  }, [
    paused,
    quizVisible,
    gameFinished,
    difficultyInfo.ghostSpeed,
    moveGhosts,
    checkGhostCollision,
    refresh,
  ]);


  /* ========================================================
     APP STATE
  ======================================================== */

  useEffect(() => {

    const subscription =
      AppState.addEventListener(
        'change',
        nextState => {

          if (
            nextState !==
              'active' &&
            runningRef.current &&
            !quizVisible &&
            !gameFinished
          ) {

            setPaused(
              true
            );
          }
        }
      );


    return () =>
      subscription.remove();

  }, [
    quizVisible,
    gameFinished,
  ]);


  /* ========================================================
     ANSWER QUESTION
  ======================================================== */

  const answerQuiz =
    useCallback(
      index => {

        if (
          !quizQuestion ||
          quizFeedback
        ) {
          return;
        }


        const correct =
          index ===
          quizQuestion.correct;


        if (correct) {

          const reward =
            difficultyInfo.coinReward;


          coinsRef.current +=
            reward;


          scoreRef.current +=
            25;


          setCoins(
            coinsRef.current
          );

          setScore(
            scoreRef.current
          );


          setQuizFeedback(
            `✓ Correct! +${reward} coins`
          );

        } else {

          scoreRef.current =
            Math.max(
              0,
              scoreRef.current -
                5
            );


          setScore(
            scoreRef.current
          );


          setQuizFeedback(
            `✗ Incorrect. Correct answer: ${
              quizQuestion.opts[
                quizQuestion.correct
              ]
            }`
          );
        }


        /*
         * The question has now been answered.
         */
        setTimeout(() => {

          const cell =
            currentQuizCellRef.current;


          if (cell) {

            /*
             * Convert the quiz node to visited.
             */
            gridRef.current[
              cell.r
            ][cell.c] =
              VISITED;


            quizRemainingRef.current =
              Math.max(
                0,
                quizRemainingRef.current -
                  1
              );


            currentQuizCellRef.current =
              null;
          }


          awaitingQuizRef.current =
            false;


          setQuizVisible(
            false
          );


          setQuizQuestion(
            null
          );


          setQuizFeedback(
            ''
          );


          refresh();


          setTimeout(
            checkWin,
            50
          );

        }, 1200);

      },
      [
        quizQuestion,
        quizFeedback,
        difficultyInfo.coinReward,
        refresh,
        checkWin,
      ]
    );


  /* ========================================================
     RESTART
  ======================================================== */

  const restartLevel =
    useCallback(() => {

      navigation.replace(
        'MazeGame',
        {
          subject,
          difficulty,
        }
      );

    }, [
      navigation,
      subject,
      difficulty,
    ]);


  /* ========================================================
     EXIT
  ======================================================== */

  const exitGame =
    useCallback(() => {

      runningRef.current =
        false;

      navigation.goBack();

    }, [
      navigation,
    ]);


  /* ========================================================
     CURRENT VALUES
  ======================================================== */

  const player =
    playerRef.current;

  const ghosts =
    ghostsRef.current;


  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <View style={styles.container}>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={exitGame}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>


        <View style={styles.headerInfo}>

          <Text style={styles.title}>
            {subjectInfo.icon}{' '}
            {subjectInfo.name}
          </Text>

          <Text style={styles.subtitle}>
            {difficultyInfo.icon}{' '}
            {difficultyInfo.name}
            {'  •  '}
            {mazeRef.current.name}
          </Text>

        </View>

      </View>


      {/* ====================================================
          HUD
      ==================================================== */}

      <View style={styles.hud}>

        <View style={styles.hudItem}>

          <Text style={styles.hudLabel}>
            LIVES
          </Text>

          <Text style={styles.hudValue}>
            {'♥ '.repeat(
              Math.max(
                0,
                lives
              )
            )}
          </Text>

        </View>


        <View style={styles.hudItem}>

          <Text style={styles.hudLabel}>
            SCORE
          </Text>

          <Text style={styles.hudValue}>
            {score}
          </Text>

        </View>


        <View style={styles.hudItem}>

          <Text style={styles.hudLabel}>
            COINS
          </Text>

          <Text style={styles.hudValue}>
            🪙 {coins}
          </Text>

        </View>


        <View style={styles.hudItem}>

          <Text style={styles.hudLabel}>
            QUESTIONS
          </Text>

          <Text style={styles.hudValue}>
            ❓ {quizRemainingRef.current}
          </Text>

        </View>


        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() =>
            setPaused(true)
          }
          disabled={
            quizVisible ||
            gameFinished
          }
        >
          <Text style={styles.pauseText}>
            ⏸
          </Text>
        </TouchableOpacity>

      </View>


      {/* ====================================================
          MAZE
      ==================================================== */}

      <View
        style={[
          styles.mazeOuter,
          {
            width:
              mazeWidth + 16,
            height:
              mazeHeight + 16,
          },
        ]}
      >

        <View
          style={{
            width:
              mazeWidth,

            height:
              mazeHeight,

            position:
              'relative',
          }}
        >

          {/* ================================================
              CELLS
          ================================================= */}

          {grid.map(
            (row, r) =>
              row.map(
                (value, c) => {

                  const cellKey =
                    `${r}-${c}`;


                  const cellStyle = {
                    position:
                      'absolute',

                    left:
                      c *
                      cellSize,

                    top:
                      r *
                      cellSize,

                    width:
                      cellSize,

                    height:
                      cellSize,

                    alignItems:
                      'center',

                    justifyContent:
                      'center',
                  };


                  /* WALL */

                  if (
                    value === WALL
                  ) {

                    return (
                      <View
                        key={
                          cellKey
                        }
                        style={[
                          styles.wall,
                          cellStyle,
                        ]}
                      />
                    );
                  }


                  /* COIN */

                  if (
                    value === COIN
                  ) {

                    return (
                      <View
                        key={
                          cellKey
                        }
                        style={
                          cellStyle
                        }
                      >

                        <View
                          style={[
                            styles.coin,
                            {
                              width:
                                Math.max(
                                  4,
                                  cellSize *
                                    0.22
                                ),

                              height:
                                Math.max(
                                  4,
                                  cellSize *
                                    0.22
                                ),

                              borderRadius:
                                cellSize *
                                0.11,
                            },
                          ]}
                        />

                      </View>
                    );
                  }


                  /* QUIZ */

                  if (
                    value === QUIZ
                  ) {

                    return (
                      <View
                        key={
                          cellKey
                        }
                        style={
                          cellStyle
                        }
                      >

                        <View
                          style={[
                            styles.quizNode,
                            {
                              width:
                                cellSize *
                                0.72,

                              height:
                                cellSize *
                                0.72,

                              borderRadius:
                                cellSize *
                                0.36,
                            },
                          ]}
                        >

                          <Text
                            style={[
                              styles.quizMark,
                              {
                                fontSize:
                                  Math.max(
                                    8,
                                    cellSize *
                                      0.42
                                  ),
                              },
                            ]}
                          >
                            ?
                          </Text>

                        </View>

                      </View>
                    );
                  }


                  /* VISITED */

                  return (
                    <View
                      key={
                        cellKey
                      }
                      style={
                        cellStyle
                      }
                    />
                  );
                }
              )
          )}


          {/* ================================================
              GHOSTS
          ================================================= */}

          {ghosts.map(
            (ghost, index) => (

              <View
                key={
                  `ghost-${index}`
                }

                style={{
                  position:
                    'absolute',

                  left:
                    ghost.c *
                    cellSize,

                  top:
                    ghost.r *
                    cellSize,

                  width:
                    cellSize,

                  height:
                    cellSize,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',
                }}
              >

                <Text
                  style={{
                    fontSize:
                      Math.max(
                        13,
                        cellSize *
                          0.8
                      ),
                  }}
                >
                  👻
                </Text>

              </View>
            )
          )}


          {/* ================================================
              PLAYER
          ================================================= */}

          <View
            style={{
              position:
                'absolute',

              left:
                player.c *
                  cellSize +
                cellSize *
                  0.18,

              top:
                player.r *
                  cellSize +
                cellSize *
                  0.18,

              width:
                cellSize *
                0.64,

              height:
                cellSize *
                0.64,

              borderRadius:
                cellSize *
                0.32,

              backgroundColor:
                colors.mint,
            }}
          />

        </View>

      </View>


      {/* ====================================================
          MAP INFORMATION
      ==================================================== */}

      <Text style={styles.mapDescription}>
        {mazeRef.current.desc}
      </Text>


      {/* ====================================================
          CONTROLS
      ==================================================== */}

      <View style={styles.controls}>

        <View style={styles.controlRow}>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              tryMove(
                ...DIRECTIONS.up
              )
            }
            disabled={
              paused ||
              quizVisible
            }
          >
            <Text style={styles.controlText}>
              ▲
            </Text>
          </TouchableOpacity>

        </View>


        <View style={styles.controlRow}>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              tryMove(
                ...DIRECTIONS.left
              )
            }
            disabled={
              paused ||
              quizVisible
            }
          >
            <Text style={styles.controlText}>
              ◀
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              tryMove(
                ...DIRECTIONS.down
              )
            }
            disabled={
              paused ||
              quizVisible
            }
          >
            <Text style={styles.controlText}>
              ▼
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              tryMove(
                ...DIRECTIONS.right
              )
            }
            disabled={
              paused ||
              quizVisible
            }
          >
            <Text style={styles.controlText}>
              ▶
            </Text>
          </TouchableOpacity>

        </View>

      </View>


      {/* ====================================================
          KEYBOARD HELP
      ==================================================== */}

      <Text style={styles.keyboardHint}>
        Keyboard: WASD / Arrow Keys
        {'  •  '}
        P = Pause
      </Text>


      {/* ====================================================
          QUIZ MODAL
      ==================================================== */}

      <Modal
        visible={
          quizVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={
              styles.quizCard
            }
          >

            {quizQuestion && (
              <>

                <Text
                  style={
                    styles.quizHeader
                  }
                >
                  {subjectInfo.icon}{' '}
                  {subjectInfo.name}
                </Text>


                <Text
                  style={
                    styles.quizDifficulty
                  }
                >
                  {difficultyInfo.icon}{' '}
                  {difficultyInfo.name}
                  {' • QUIZ NODE'}
                </Text>


                <Text
                  style={
                    styles.question
                  }
                >
                  {quizQuestion.q}
                </Text>


                {quizQuestion.opts.map(
                  (
                    option,
                    index
                  ) => (

                    <TouchableOpacity
                      key={
                        index
                      }

                      style={
                        styles.answerButton
                      }

                      onPress={() =>
                        answerQuiz(
                          index
                        )
                      }

                      disabled={
                        !!quizFeedback
                      }
                    >

                      <View
                        style={
                          styles.answerLetter
                        }
                      >

                        <Text
                          style={
                            styles.answerLetterText
                          }
                        >
                          {String.fromCharCode(
                            65 +
                              index
                          )}
                        </Text>

                      </View>


                      <Text
                        style={
                          styles.answerText
                        }
                      >
                        {option}
                      </Text>

                    </TouchableOpacity>
                  )
                )}


                {quizFeedback ? (

                  <Text
                    style={
                      styles.feedback
                    }
                  >
                    {quizFeedback}
                  </Text>

                ) : (

                  <Text
                    style={
                      styles.questionHint
                    }
                  >
                    Choose an answer to continue.
                  </Text>

                )}

              </>
            )}

          </View>

        </View>

      </Modal>


      {/* ====================================================
          PAUSE MODAL
      ==================================================== */}

      <Modal
        visible={
          paused
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPaused(false)
        }
      >

        <View
          style={
            styles.pauseOverlay
          }
        >

          <View
            style={
              styles.pauseCard
            }
          >

            <Text
              style={
                styles.pauseIcon
              }
            >
              ⏸
            </Text>


            <Text
              style={
                styles.pauseTitle
              }
            >
              GAME PAUSED
            </Text>


            <Text
              style={
                styles.pauseSubtitle
              }
            >
              {subjectInfo.icon}{' '}
              {subjectInfo.name}
              {'\n'}
              {difficultyInfo.icon}{' '}
              {difficultyInfo.name}
            </Text>


            <TouchableOpacity
              style={
                styles.resumeButton
              }
              onPress={() =>
                setPaused(
                  false
                )
              }
            >

              <Text
                style={
                  styles.resumeText
                }
              >
                ▶ RESUME
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.restartButton
              }
              onPress={
                restartLevel
              }
            >

              <Text
                style={
                  styles.restartText
                }
              >
                ↻ RESTART LEVEL
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.exitButton
              }
              onPress={() => {

                setPaused(
                  false
                );

                exitGame();

              }}
            >

              <Text
                style={
                  styles.exitText
                }
              >
                EXIT LEVEL
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>

>>>>>>> origin/maze-updates
    </View>
  );
}

<<<<<<< HEAD
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
=======


const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        colors.bg,
      padding: 16,
      paddingTop: 45,
    },


    /* HEADER */

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 9,
    },


    backButton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor:
        colors.panel,
      borderWidth: 2,
      borderColor:
        colors.wallEdge,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 10,
    },


    backText: {
      color:
        colors.ink,
      fontSize: 25,
    },


    headerInfo: {
      flex: 1,
    },


    title: {
      color:
        colors.ink,
      fontSize: 15,
      fontWeight: '900',
    },


    subtitle: {
      color:
        colors.inkDim,
      fontSize: 9.5,
      marginTop: 2,
    },


    /* HUD */

    hud: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        colors.panel,
      borderWidth: 2,
      borderColor:
        colors.wallEdge,
      borderRadius: 13,
      padding: 8,
      gap: 6,
      marginBottom: 9,
    },


    hudItem: {
      flex: 1,
    },


    hudLabel: {
      color:
        colors.inkDim,
      fontSize: 7.5,
      fontWeight: '900',
      marginBottom: 2,
    },


    hudValue: {
      color:
        colors.gold,
      fontSize: 11,
      fontWeight: '900',
    },


    pauseButton: {
      width: 37,
      height: 37,
      borderRadius: 10,
      backgroundColor:
        colors.panelLight,
      borderWidth: 2,
      borderColor:
        colors.wallEdge,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    pauseText: {
      color:
        colors.ink,
      fontSize: 15,
      fontWeight: '900',
    },


    /* MAZE */

    mazeOuter: {
      alignSelf:
        'center',
      backgroundColor:
        colors.panel,
      borderWidth: 2,
      borderColor:
        colors.wallEdge,
      borderRadius: 14,
      padding: 8,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    wall: {
      backgroundColor:
        colors.wall,
      borderWidth: 1,
      borderColor:
        'rgba(157,78,221,0.55)',
    },


    coin: {
      backgroundColor:
        colors.gold,
    },


    quizNode: {
      backgroundColor:
        colors.coral,
      borderWidth: 2,
      borderColor:
        colors.gold,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    quizMark: {
      color:
        colors.bg,
      fontWeight:
        '900',
    },


    mapDescription: {
      color:
        colors.inkDim,
      textAlign:
        'center',
      fontSize: 9,
      marginTop: 6,
    },


    /* CONTROLS */

    controls: {
      alignItems:
        'center',
      marginTop: 7,
      gap: 5,
    },


    controlRow: {
      flexDirection:
        'row',
      gap: 5,
    },


    controlButton: {
      width: 47,
      height: 41,
      borderRadius: 10,
      backgroundColor:
        colors.panelLight,
      borderWidth: 2,
      borderColor:
        colors.wallEdge,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    controlText: {
      color:
        colors.ink,
      fontSize: 16,
      fontWeight: '900',
    },


    keyboardHint: {
      color:
        colors.inkDim,
      textAlign:
        'center',
      fontSize: 8.5,
      marginTop: 5,
    },


    /* QUIZ */

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(8,4,24,0.88)',
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 18,
    },


    quizCard: {
      width: '100%',
      maxWidth: 370,
      backgroundColor:
        colors.panelLight,
      borderWidth: 2,
      borderColor:
        colors.coral,
      borderRadius: 18,
      padding: 18,
    },


    quizHeader: {
      color:
        colors.coral,
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 2,
    },


    quizDifficulty: {
      color:
        colors.inkDim,
      fontSize: 8.5,
      fontWeight: '800',
      marginBottom: 13,
    },


    question: {
      color:
        colors.ink,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '700',
      marginBottom: 13,
    },


    answerButton: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        colors.panel,
      borderWidth: 2,
      borderColor:
        colors.wallEdge,
      borderRadius: 10,
      padding: 9,
      marginBottom: 7,
    },


    answerLetter: {
      width: 25,
      height: 25,
      borderRadius: 13,
      backgroundColor:
        colors.coral,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 8,
    },


    answerLetterText: {
      color:
        colors.bg,
      fontSize: 10,
      fontWeight: '900',
    },


    answerText: {
      color:
        colors.ink,
      fontSize: 12,
      flex: 1,
    },


    feedback: {
      color:
        colors.ink,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 6,
      fontWeight: '800',
    },


    questionHint: {
      color:
        colors.inkDim,
      fontSize: 9,
      marginTop: 3,
    },


    /* PAUSE */

    pauseOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(8,4,24,0.90)',
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 20,
    },


    pauseCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor:
        colors.panelLight,
      borderWidth: 2,
      borderColor:
        colors.mint,
      borderRadius: 19,
      padding: 23,
    },


    pauseIcon: {
      textAlign:
        'center',
      fontSize: 38,
      marginBottom: 6,
    },


    pauseTitle: {
      color:
        colors.ink,
      fontSize: 19,
      fontWeight: '900',
      textAlign:
        'center',
    },


    pauseSubtitle: {
      color:
        colors.inkDim,
      fontSize: 10,
      textAlign:
        'center',
      lineHeight: 17,
      marginTop: 5,
      marginBottom: 18,
    },


    resumeButton: {
      backgroundColor:
        colors.mint,
      borderRadius: 11,
      paddingVertical: 13,
      alignItems:
        'center',
    },


    resumeText: {
      color:
        '#062B1F',
      fontWeight:
        '900',
      fontSize: 12,
    },


    restartButton: {
      backgroundColor:
        colors.panel,
      borderWidth: 2,
      borderColor:
        colors.wallEdge,
      borderRadius: 11,
      paddingVertical: 12,
      alignItems:
        'center',
      marginTop: 9,
    },


    restartText: {
      color:
        colors.ink,
      fontWeight:
        '900',
      fontSize: 11,
    },


    exitButton: {
      borderWidth: 2,
      borderColor:
        colors.coral,
      borderRadius: 11,
      paddingVertical: 11,
      alignItems:
        'center',
      marginTop: 9,
    },


    exitText: {
      color:
        colors.coral,
      fontWeight:
        '900',
      fontSize: 10,
    },

  });
>>>>>>> origin/maze-updates
