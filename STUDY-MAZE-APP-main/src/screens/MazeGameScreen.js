import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AppState,
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

import {
  SUBJECTS,
  DIFFICULTIES,
  getRandomMaze,
  prepareMazeMap,
} from './mazeData.js';

import { buildActiveQuestionPool } from './quizBank';

import {
  searchQuizAPISubject,
  getQuizBank,
} from '../api/questions';


/* ==========================================================
   STORAGE
========================================================== */

const FAVORITES_STORAGE_KEY = '@study_maze_favorite_subjects';


/* ==========================================================
   GRID VALUES
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
   DEFAULT SUBJECT ICON
========================================================== */

const DEFAULT_SUBJECT_ICON = '📚';


/* ==========================================================
   MAIN SCREEN
========================================================== */

export default function MazeGameScreen({ route, navigation }) {

  const { width, height } = useWindowDimensions();
  const { recordGame } = useAuth();

  const incomingSubject =
    route?.params?.selectedSubject || null;


  /* ========================================================
     SCREEN FLOW
  ======================================================== */

  const [screenMode, setScreenMode] = useState(
    incomingSubject ? 'difficulty' : 'dashboard'
  );

  const [selectedSubject, setSelectedSubject] = useState(
    incomingSubject
  );

  const [selectedDifficulty, setSelectedDifficulty] =
    useState(null);


  /* ========================================================
     SUBJECT SEARCH
  ======================================================== */

  const [subjectSearch, setSubjectSearch] = useState('');
  const [searchingSubject, setSearchingSubject] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');


  /* ========================================================
     FAVORITES
  ======================================================== */

  const [favoriteSubjects, setFavoriteSubjects] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);


  /* ========================================================
     GAME REFS
  ======================================================== */

  const mazeRef = useRef(null);
  const gridRef = useRef(null);
  const playerRef = useRef({ r: 1, c: 1 });
  const ghostsRef = useRef([]);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const runningRef = useRef(false);
  const gameFinishedRef = useRef(false);
  const awaitingQuizRef = useRef(false);
  const currentQuizCellRef = useRef(null);

  /* Quiz pool is NEVER drained — we cycle through it. */
  const quizPoolRef = useRef([]);
  const quizIndexRef = useRef(0);
  const quizLoadingRef = useRef(false);

  const coinsRemainingRef = useRef(0);
  const quizRemainingRef = useRef(0);
  const quizAnsweredRef = useRef(0);
  const quizTotalRef = useRef(0);


  /* ========================================================
     GAME STATE
  ======================================================== */

  const [, forceRender] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [paused, setPaused] = useState(false);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [gameFinished, setGameFinished] = useState(false);


  const refresh = useCallback(() => {
    forceRender(value => value + 1);
  }, []);


  /* ========================================================
     LOAD FAVORITES
  ======================================================== */

  useEffect(() => {
    let mounted = true;

    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);

        if (!mounted) return;

        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setFavoriteSubjects(parsed);
        }
      } catch (error) {
        console.log('Could not load favorite subjects:', error);
      } finally {
        if (mounted) setFavoritesLoaded(true);
      }
    };

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, []);


  const saveFavorites = useCallback(async favorites => {
    try {
      await AsyncStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.log('Could not save favorite subjects:', error);
    }
  }, []);


  const isFavorite = useCallback(
    subjectName => {
      if (!subjectName) return false;
      return favoriteSubjects.some(
        item =>
          String(item.name).toLowerCase() ===
          String(subjectName).toLowerCase()
      );
    },
    [favoriteSubjects]
  );


  const addFavorite = useCallback(
    subjectData => {
      if (!subjectData?.name) return;
      if (isFavorite(subjectData.name)) return;

      const newFavorite = {
        id:
          subjectData.id ||
          String(subjectData.name)
            .toLowerCase()
            .replace(/\s+/g, '-'),
        name: subjectData.name,
        icon: subjectData.icon || DEFAULT_SUBJECT_ICON,
        questionCount: Number(subjectData.questionCount || 0),
        quizCount: Number(subjectData.quizCount || 0),
        source: 'quizapi',
      };

      const updated = [...favoriteSubjects, newFavorite];
      setFavoriteSubjects(updated);
      saveFavorites(updated);
    },
    [favoriteSubjects, isFavorite, saveFavorites]
  );


  const removeFavorite = useCallback(
    subjectName => {
      const updated = favoriteSubjects.filter(
        item =>
          String(item.name).toLowerCase() !==
          String(subjectName).toLowerCase()
      );

      setFavoriteSubjects(updated);
      saveFavorites(updated);
    },
    [favoriteSubjects, saveFavorites]
  );


  const searchSubject = useCallback(async () => {
    const term = subjectSearch.trim();

    if (!term) {
      setSearchResult(null);
      setSearchError('Enter a subject to search.');
      return;
    }

    setSearchingSubject(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const result = await searchQuizAPISubject(term);

      if (!result) {
        setSearchResult({
          subject: term,
          available: false,
          questionCount: 0,
          quizCount: 0,
        });
        return;
      }

      setSearchResult(result);
    } catch (error) {
      console.log('QuizAPI subject search failed:', error);
      setSearchError(error?.message || 'Unable to search QuizAPI.');
    } finally {
      setSearchingSubject(false);
    }
  }, [subjectSearch]);


  /* ========================================================
     SUBJECT + DIFFICULTY INFO
  ======================================================== */

  const subjectInfo = useMemo(() => {
    if (!selectedSubject) {
      return {
        id: '',
        name: '',
        shortName: '',
        icon: DEFAULT_SUBJECT_ICON,
      };
    }

    const value = String(selectedSubject);

    return (
      SUBJECTS.find(
        item =>
          item.id === value ||
          item.shortName?.toLowerCase() === value.toLowerCase() ||
          item.name?.toLowerCase() === value.toLowerCase()
      ) || {
        id: value,
        name: value,
        shortName: value,
        icon: DEFAULT_SUBJECT_ICON,
      }
    );
  }, [selectedSubject]);


  const difficultyInfo = useMemo(() => {
    return (
      DIFFICULTIES.find(item => item.id === selectedDifficulty) || {
        id: selectedDifficulty || 'easy',
        name: 'Easy',
        icon: '🟢',
        ghostSpeed: 650,
        coinValue: 1,
        coinReward: 2,
      }
    );
  }, [selectedDifficulty]);


  const chooseSubject = useCallback(subjectName => {
    if (!subjectName) return;
    setSelectedSubject(subjectName);
    setSelectedDifficulty(null);
    setScreenMode('difficulty');
  }, []);


  const chooseDifficulty = useCallback(
    difficulty => {
      if (!selectedSubject || !difficulty?.id) return;
      setSelectedDifficulty(difficulty.id);
      setScreenMode('game');
    },
    [selectedSubject]
  );


  /* ========================================================
     LOAD QUESTION POOL (QuizAPI first, quizBank.js fallback)

     Returns an array of questions in the Study Maze shape:
       { id?, q, opts: string[], correct: number, ... }
  ======================================================== */

  const loadQuestionPool = useCallback(async () => {
    /* 1. Try QuizAPI via questions.js */
    try {
      const result = await getQuizBank({
        subject: selectedSubject,
        difficulty: selectedDifficulty,
      });

      const questions = result?.questions || [];

      if (questions.length > 0) {
        return questions;
      }

      console.log(
        'QuizAPI returned no questions for',
        selectedSubject,
        selectedDifficulty
      );
    } catch (error) {
      console.log('QuizAPI fetch failed, falling back to quizBank.js:', error);
    }

    /* 2. Fallback: local quizBank.js */
    const fallback = buildActiveQuestionPool(
      [],
      subjectInfo.shortName || subjectInfo.name || selectedSubject,
      selectedDifficulty
    );

    return Array.isArray(fallback) ? fallback : [];
  }, [
    selectedSubject,
    selectedDifficulty,
    subjectInfo.shortName,
    subjectInfo.name,
  ]);


  /* ========================================================
     INITIALIZE GAME
  ======================================================== */

  useEffect(() => {
    if (screenMode !== 'game') return;
    if (!selectedDifficulty) return;

    const selectedMap = getRandomMaze(selectedDifficulty);
    const preparedMaze = prepareMazeMap(selectedMap);

    mazeRef.current = preparedMaze;
    gridRef.current = preparedMaze.grid.map(row => [...row]);

    playerRef.current = {
      ...(preparedMaze.playerStart || { r: 1, c: 1 }),
    };

    ghostsRef.current = (preparedMaze.ghostStarts || []).map(ghost => ({
      ...ghost,
    }));

    livesRef.current = 3;
    scoreRef.current = 0;
    coinsRef.current = 0;
    runningRef.current = true;
    gameFinishedRef.current = false;
    awaitingQuizRef.current = false;
    currentQuizCellRef.current = null;
    quizAnsweredRef.current = 0;

    const totalCoins = gridRef.current
      .flat()
      .filter(value => value === COIN).length;

    coinsRemainingRef.current = totalCoins;

    const totalQuizCells =
      gridRef.current
        .flat()
        .filter(value => value === QUIZ).length;

    quizTotalRef.current = totalQuizCells;
    quizRemainingRef.current = totalQuizCells;

    /* Reset the quiz pool. It will be filled below. */
    quizPoolRef.current = [];
    quizIndexRef.current = 0;

    setLives(3);
    setScore(0);
    setCoins(0);
    setPaused(false);
    setQuizVisible(false);
    setQuizQuestion(null);
    setQuizFeedback('');
    setGameFinished(false);

    refresh();
  }, [screenMode, selectedDifficulty, refresh]);


  /* ========================================================
     LOAD QUESTIONS WHEN GAME STARTS
  ======================================================== */

  useEffect(() => {
    if (screenMode !== 'game') return undefined;
    if (!selectedSubject) return undefined;

    let alive = true;

    const load = async () => {
      quizLoadingRef.current = true;

      const pool = await loadQuestionPool();

      if (!alive) return;

      quizPoolRef.current = pool;
      quizIndexRef.current = 0;
      quizLoadingRef.current = false;

      console.log(
        'Quiz pool ready:',
        pool.length,
        'questions for',
        selectedSubject,
        selectedDifficulty
      );
    };

    load();

    return () => {
      alive = false;
    };
  }, [
    screenMode,
    selectedSubject,
    selectedDifficulty,
    loadQuestionPool,
  ]);


  /* ========================================================
     NEXT QUESTION

     Never drains the pool. Cycles through it. If empty,
     tries quizBank.js synchronously and kicks off a
     background QuizAPI refetch.
  ======================================================== */

  const nextQuestion = useCallback(() => {
    /* Pool empty? Use local quizBank.js so the game never blocks. */
    if (!quizPoolRef.current || quizPoolRef.current.length === 0) {
      const fallback = buildActiveQuestionPool(
        [],
        subjectInfo.shortName || subjectInfo.name || selectedSubject,
        selectedDifficulty
      );

      quizPoolRef.current = Array.isArray(fallback) ? fallback : [];
      quizIndexRef.current = 0;

      /* Background refill from QuizAPI (fire-and-forget). */
      loadQuestionPool()
        .then(pool => {
          if (pool && pool.length > 0) {
            quizPoolRef.current = pool;
            quizIndexRef.current = 0;
          }
        })
        .catch(() => {});
    }

    /* Still empty — safe fallback. */
    if (!quizPoolRef.current || quizPoolRef.current.length === 0) {
      return {
        q: 'No questions available for this subject yet. Choose any answer to continue.',
        opts: ['Continue', 'Continue', 'Continue', 'Continue'],
        correct: 0,
      };
    }

    /* Wrap around when we reach the end. */
    if (quizIndexRef.current >= quizPoolRef.current.length) {
      quizIndexRef.current = 0;

      /* Refresh from QuizAPI in the background for next nodes. */
      loadQuestionPool()
        .then(pool => {
          if (pool && pool.length > 0) {
            quizPoolRef.current = pool;
          }
        })
        .catch(() => {});
    }

    const question = quizPoolRef.current[quizIndexRef.current];
    quizIndexRef.current += 1;

    return question;
  }, [
    subjectInfo.shortName,
    subjectInfo.name,
    selectedSubject,
    selectedDifficulty,
    loadQuestionPool,
  ]);


  /* ========================================================
     OPEN QUIZ
  ======================================================== */

  const openQuiz = useCallback(
    async cell => {
      if (
        awaitingQuizRef.current ||
        quizVisible ||
        gameFinishedRef.current
      ) {
        return;
      }

      awaitingQuizRef.current = true;

      /* Show loader while we resolve the question. */
      setQuizFeedback('');
      setQuizQuestion(null);
      setQuizLoading(true);
      setQuizVisible(true);

      /* If the pool is empty, try QuizAPI on demand. */
      if (!quizPoolRef.current || quizPoolRef.current.length === 0) {
        try {
          const pool = await loadQuestionPool();
          if (pool && pool.length > 0) {
            quizPoolRef.current = pool;
            quizIndexRef.current = 0;
          }
        } catch (error) {
          console.log('On-demand QuizAPI fetch failed:', error);
        }
      }

      const question = nextQuestion();

      /* Mark cell visited immediately so it can't re-trigger. */
      if (gridRef.current?.[cell.r]) {
        gridRef.current[cell.r][cell.c] = VISITED;
      }

      currentQuizCellRef.current = cell;
      setQuizQuestion(question);
      setQuizFeedback('');
      setQuizLoading(false);
    },
    [
      quizVisible,
      nextQuestion,
      loadQuestionPool,
    ]
  );


  /* ========================================================
     FINISH GAME
  ======================================================== */

  const finishGame = useCallback(
    async outcome => {
      if (gameFinishedRef.current) return;

      gameFinishedRef.current = true;
      runningRef.current = false;

      setGameFinished(true);

      try {
        await recordGame('quiz_maze', {
          subject: selectedSubject,
          difficulty: selectedDifficulty,
          score: scoreRef.current,
          coins: coinsRef.current,
          coinsCollected: Math.max(
            0,
            gridRef.current
              ?.flat()
              .filter(value => value === COIN).length || 0
          ),
          questionsAnswered: quizAnsweredRef.current,
        });
      } catch (error) {
        console.log('Could not record maze game:', error);
      }

      navigation.replace('MazeResult', {
        outcome,
        score: scoreRef.current,
        coins: coinsRef.current,
        subject: selectedSubject,
        difficulty: selectedDifficulty,
      });
    },
    [
      recordGame,
      navigation,
      selectedSubject,
      selectedDifficulty,
    ]
  );


  /* ========================================================
     CHECK WIN
  ======================================================== */

  const checkWin = useCallback(() => {
    if (gameFinishedRef.current) return;

    if (quizVisible || awaitingQuizRef.current) return;

    if (coinsRemainingRef.current <= 0) {
      finishGame('win');
    }
  }, [quizVisible, finishGame]);


  /* ========================================================
     LOSE LIFE
  ======================================================== */

  const loseLife = useCallback(() => {
    if (!runningRef.current || gameFinishedRef.current) return;

    const nextLives = livesRef.current - 1;
    livesRef.current = nextLives;
    setLives(nextLives);

    if (nextLives <= 0) {
      finishGame('lose');
      return;
    }

    runningRef.current = false;

    setTimeout(() => {
      if (gameFinishedRef.current) return;

      playerRef.current = {
        ...(mazeRef.current?.playerStart || { r: 1, c: 1 }),
      };

      ghostsRef.current = (mazeRef.current?.ghostStarts || []).map(
        ghost => ({ ...ghost })
      );

      runningRef.current = true;
      refresh();
    }, 700);
  }, [finishGame, refresh]);


  const checkGhostCollision = useCallback(() => {
    const player = playerRef.current;
    const collision = ghostsRef.current.some(
      ghost => ghost.r === player.r && ghost.c === player.c
    );

    if (collision) loseLife();
  }, [loseLife]);


  /* ========================================================
     MOVE GHOSTS
  ======================================================== */

  const moveGhosts = useCallback(() => {
    if (
      !runningRef.current ||
      paused ||
      quizVisible ||
      !gridRef.current
    ) {
      return;
    }

    const player = playerRef.current;
    const rows = gridRef.current.length;
    const cols = gridRef.current[0]?.length || 1;

    ghostsRef.current.forEach(ghost => {
      const possibleMoves = Object.values(DIRECTIONS);

      possibleMoves.sort((a, b) => {
        const aR = ghost.r + a[0];
        const aC = ghost.c + a[1];
        const bR = ghost.r + b[0];
        const bC = ghost.c + b[1];

        const aDistance =
          Math.abs(player.r - aR) + Math.abs(player.c - aC);
        const bDistance =
          Math.abs(player.r - bR) + Math.abs(player.c - bC);

        return aDistance - bDistance;
      });

      if (Math.random() < 0.35) {
        possibleMoves.sort(() => Math.random() - 0.5);
      }

      for (const [dr, dc] of possibleMoves) {
        const nr = ghost.r + dr;
        const nc = ghost.c + dc;

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (gridRef.current[nr][nc] === WALL) continue;

        ghost.r = nr;
        ghost.c = nc;
        break;
      }
    });
  }, [paused, quizVisible]);


  /* ========================================================
     MOVE PLAYER
  ======================================================== */

  const tryMove = useCallback(
    (dr, dc) => {
      if (
        screenMode !== 'game' ||
        !runningRef.current ||
        paused ||
        quizVisible ||
        awaitingQuizRef.current ||
        gameFinishedRef.current ||
        !gridRef.current
      ) {
        return;
      }

      const player = playerRef.current;
      const rows = gridRef.current.length;
      const cols = gridRef.current[0]?.length || 1;

      const nextR = player.r + dr;
      const nextC = player.c + dc;

      if (nextR < 0 || nextR >= rows || nextC < 0 || nextC >= cols) {
        return;
      }

      if (gridRef.current[nextR][nextC] === WALL) return;

      playerRef.current = { r: nextR, c: nextC };

      const cell = gridRef.current[nextR][nextC];

      if (cell === COIN) {
        gridRef.current[nextR][nextC] = VISITED;

        coinsRemainingRef.current = Math.max(
          0,
          coinsRemainingRef.current - 1
        );

        coinsRef.current += difficultyInfo.coinValue || 1;
        scoreRef.current += 10;

        setCoins(coinsRef.current);
        setScore(scoreRef.current);
      } else if (cell === QUIZ) {
        openQuiz({ r: nextR, c: nextC });
      }

      checkGhostCollision();
      refresh();

      setTimeout(checkWin, 30);
    },
    [
      screenMode,
      paused,
      quizVisible,
      difficultyInfo.coinValue,
      openQuiz,
      checkGhostCollision,
      refresh,
      checkWin,
    ]
  );


  /* ========================================================
     KEYBOARD
  ======================================================== */

  useEffect(() => {
    if (screenMode !== 'game' || typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = event => {
      switch (event.key.toLowerCase()) {
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
          if (!quizVisible && !gameFinished) {
            setPaused(current => !current);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screenMode, tryMove, quizVisible, gameFinished]);


  /* ========================================================
     GHOST TIMER
  ======================================================== */

  useEffect(() => {
    if (
      screenMode !== 'game' ||
      paused ||
      quizVisible ||
      gameFinished
    ) {
      return undefined;
    }

    const timer = setInterval(() => {
      moveGhosts();
      checkGhostCollision();
      refresh();
    }, difficultyInfo.ghostSpeed || 650);

    return () => clearInterval(timer);
  }, [
    screenMode,
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
    const subscription = AppState.addEventListener(
      'change',
      nextState => {
        if (
          nextState !== 'active' &&
          runningRef.current &&
          !quizVisible &&
          !gameFinished
        ) {
          setPaused(true);
        }
      }
    );

    return () => subscription.remove();
  }, [quizVisible, gameFinished]);


  /* ========================================================
     ANSWER QUIZ
  ======================================================== */

  const answerQuiz = useCallback(
    index => {
      if (!quizQuestion || quizFeedback) return;

      const correct = index === quizQuestion.correct;

      if (correct) {
        const reward = difficultyInfo.coinReward || 2;
        coinsRef.current += reward;
        scoreRef.current += 25;

        setCoins(coinsRef.current);
        setScore(scoreRef.current);
        setQuizFeedback(`✓ Correct! +${reward} coins`);
      } else {
        scoreRef.current = Math.max(0, scoreRef.current - 5);
        setScore(scoreRef.current);
        setQuizFeedback(
          `✗ Incorrect. Correct answer: ${
            quizQuestion.opts[quizQuestion.correct]
          }`
        );
      }

      quizAnsweredRef.current += 1;

      setTimeout(() => {
        const cell = currentQuizCellRef.current;

        if (cell) {
          quizRemainingRef.current = Math.max(
            0,
            quizRemainingRef.current - 1
          );
          currentQuizCellRef.current = null;
        }

        awaitingQuizRef.current = false;
        setQuizVisible(false);
        setQuizQuestion(null);
        setQuizFeedback('');

        refresh();

        setTimeout(checkWin, 50);
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
     RESTART GAME
  ======================================================== */

  const restartGame = useCallback(() => {
    const selectedMap = getRandomMaze(selectedDifficulty || 'easy');
    const preparedMaze = prepareMazeMap(selectedMap);

    mazeRef.current = preparedMaze;
    gridRef.current = preparedMaze.grid.map(row => [...row]);

    playerRef.current = {
      ...(preparedMaze.playerStart || { r: 1, c: 1 }),
    };

    ghostsRef.current = (preparedMaze.ghostStarts || []).map(ghost => ({
      ...ghost,
    }));

    livesRef.current = 3;
    scoreRef.current = 0;
    coinsRef.current = 0;
    gameFinishedRef.current = false;
    runningRef.current = true;
    awaitingQuizRef.current = false;
    currentQuizCellRef.current = null;
    quizAnsweredRef.current = 0;

    const newTotalCoins = gridRef.current
      .flat()
      .filter(value => value === COIN).length;

    coinsRemainingRef.current = newTotalCoins;

    const newTotalQuizCells = gridRef.current
      .flat()
      .filter(value => value === QUIZ).length;

    quizTotalRef.current = newTotalQuizCells;
    quizRemainingRef.current = newTotalQuizCells;

    quizIndexRef.current = 0;

    setLives(3);
    setScore(0);
    setCoins(0);
    setPaused(false);
    setGameFinished(false);
    setQuizVisible(false);
    setQuizQuestion(null);
    setQuizFeedback('');

    refresh();
  }, [selectedDifficulty, refresh]);


  /* ========================================================
     BACK TO DASHBOARD
  ======================================================== */

  const backToDashboard = useCallback(() => {
    runningRef.current = false;

    setPaused(false);
    setQuizVisible(false);
    setQuizQuestion(null);
    setQuizFeedback('');

    if (incomingSubject) {
      navigation.goBack();
      return;
    }

    setScreenMode('dashboard');
    setSelectedSubject(null);
    setSelectedDifficulty(null);

    mazeRef.current = null;
    gridRef.current = null;
    quizPoolRef.current = [];
    quizIndexRef.current = 0;
    awaitingQuizRef.current = false;
    gameFinishedRef.current = false;
  }, [incomingSubject, navigation]);


  /* ========================================================
     DIFFICULTY DESCRIPTION
  ======================================================== */

  const getDifficultyDescription = difficulty => {
    if (difficulty?.desc) return difficulty.desc;

    switch (difficulty?.id) {
      case 'easy':
        return 'A relaxed maze for learning the game.';
      case 'medium':
        return 'Faster ghosts and more challenging paths.';
      case 'hard':
        return 'A serious challenge for experienced players.';
      case 'expert':
        return 'Maximum challenge and maximum rewards.';
      default:
        return 'Choose this difficulty to begin.';
    }
  };


  /* ========================================================
     DASHBOARD SCREEN
  ======================================================== */

  if (screenMode === 'dashboard') {
    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={21}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.title}>Maze Game</Text>
              <Text style={styles.subtitle}>
                Search, favorite and play any subject
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={COLORS.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="game-controller"
                  size={28}
                  color={COLORS.accent}
                />
              </View>
              <Text style={styles.heroTitle}>Study Maze</Text>
              <Text style={styles.heroText}>
                Choose any subject, select your difficulty and enter the maze.
              </Text>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons
                name="sparkles"
                size={14}
                color={COLORS.accent}
              />
              <Text style={styles.heroBadgeText}>
                Learn • Play • Earn
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.searchSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Find a Subject</Text>
                <Text style={styles.sectionSubtitle}>
                  Search QuizAPI for any subject.
                </Text>
              </View>
              <View style={styles.searchIconBox}>
                <Ionicons
                  name="search"
                  size={18}
                  color={COLORS.primary}
                />
              </View>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                value={subjectSearch}
                onChangeText={value => {
                  setSubjectSearch(value);
                  setSearchResult(null);
                  setSearchError('');
                }}
                placeholder="Mathematics, Python, Cybersecurity..."
                placeholderTextColor={COLORS.textTertiary}
                style={styles.searchInput}
                onSubmitEditing={searchSubject}
                returnKeyType="search"
              />

              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchSubject}
                disabled={searchingSubject}
              >
                {searchingSubject ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.white}
                  />
                ) : (
                  <Ionicons
                    name="search"
                    size={19}
                    color={COLORS.white}
                  />
                )}
              </TouchableOpacity>
            </View>

            {searchError ? (
              <Text style={styles.searchError}>{searchError}</Text>
            ) : null}

            {searchResult ? (
              <View style={styles.searchResultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultIconBox}>
                    <Ionicons
                      name="book"
                      size={22}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.resultInfo}>
                    <Text style={styles.resultSubject}>
                      {searchResult.subject || subjectSearch}
                    </Text>

                    {searchResult.available ? (
                      <View style={styles.availableRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={COLORS.success}
                        />
                        <Text style={styles.availableText}>
                          Available on QuizAPI
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.availableRow}>
                        <Ionicons
                          name="close-circle"
                          size={14}
                          color={COLORS.error || '#E85D5D'}
                        />
                        <Text style={styles.unavailableText}>
                          Not available on QuizAPI
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {searchResult.available ? (
                  <>
                    <Text style={styles.resultMeta}>
                      {searchResult.questionCount || 0}
                      {' questions  •  '}
                      {searchResult.quizCount || 0}
                      {' quizzes'}
                    </Text>

                    <View style={styles.resultActions}>
                      <TouchableOpacity
                        style={[
                          styles.favoriteButton,
                          isFavorite(searchResult.subject) &&
                            styles.favoriteButtonActive,
                        ]}
                        onPress={() => {
                          if (isFavorite(searchResult.subject)) {
                            removeFavorite(searchResult.subject);
                          } else {
                            addFavorite({
                              name: searchResult.subject,
                              questionCount: searchResult.questionCount,
                              quizCount: searchResult.quizCount,
                            });
                          }
                        }}
                      >
                        <Ionicons
                          name={
                            isFavorite(searchResult.subject)
                              ? 'star'
                              : 'star-outline'
                          }
                          size={16}
                          color={
                            isFavorite(searchResult.subject)
                              ? COLORS.white
                              : COLORS.primary
                          }
                        />
                        <Text
                          style={[
                            styles.favoriteButtonText,
                            isFavorite(searchResult.subject) &&
                              styles.favoriteButtonTextActive,
                          ]}
                        >
                          {isFavorite(searchResult.subject)
                            ? 'Favorited'
                            : 'Favorite'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.playSubjectButton}
                        onPress={() => chooseSubject(searchResult.subject)}
                      >
                        <Ionicons
                          name="play"
                          size={15}
                          color={COLORS.white}
                        />
                        <Text style={styles.playSubjectText}>Play</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.favoritesSection}>
            <View style={styles.favoriteHeaderRow}>
              <View style={styles.favoriteHeaderInfo}>
                <Text style={styles.sectionTitle}>Favorite Subjects</Text>
                <Text style={styles.sectionSubtitle}>
                  Tap a favorite to choose its difficulty.
                </Text>
              </View>

              <View style={styles.favoriteCount}>
                <Text style={styles.favoriteCountText}>
                  {favoriteSubjects.length}
                </Text>
              </View>
            </View>

            {favoritesLoaded && favoriteSubjects.length === 0 ? (
              <View style={styles.emptyFavorites}>
                <View style={styles.emptyIconBox}>
                  <Ionicons
                    name="star-outline"
                    size={28}
                    color={COLORS.accent}
                  />
                </View>
                <Text style={styles.emptyFavoriteTitle}>
                  No favorite subjects yet
                </Text>
                <Text style={styles.emptyFavoriteText}>
                  Search for a subject above. When QuizAPI finds it, tap
                  Favorite to save it here.
                </Text>
              </View>
            ) : null}

            {favoriteSubjects.map(favorite => (
              <View key={favorite.id} style={styles.favoriteCard}>
                <TouchableOpacity
                  style={styles.favoriteMain}
                  onPress={() => chooseSubject(favorite.name)}
                >
                  <View style={styles.favoriteIconBox}>
                    <Text style={styles.favoriteIcon}>
                      {favorite.icon || DEFAULT_SUBJECT_ICON}
                    </Text>
                  </View>

                  <View style={styles.favoriteInfo}>
                    <Text style={styles.favoriteName}>
                      {favorite.name}
                    </Text>
                    <Text style={styles.favoriteMeta}>
                      {favorite.questionCount
                        ? `${favorite.questionCount} questions`
                        : 'QuizAPI subject'}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeFavoriteButton}
                  onPress={() => removeFavorite(favorite.name)}
                >
                  <Ionicons
                    name="star"
                    size={15}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }


  /* ========================================================
     DIFFICULTY SCREEN
  ======================================================== */

  if (screenMode === 'difficulty') {
    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={backToDashboard}
            >
              <Ionicons
                name="chevron-back"
                size={21}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.title}>Maze Runner</Text>
              <Text style={styles.subtitle}>
                Choose your challenge
              </Text>
            </View>
          </View>

          {/* Selected Subject */}
          <View style={styles.subjectCard}>
            <View style={styles.subjectIconBox}>
              <Text style={styles.subjectIcon}>
                {subjectInfo.icon || DEFAULT_SUBJECT_ICON}
              </Text>
            </View>

            <View style={styles.subjectInfo}>
              <Text style={styles.subjectLabel}>
                SELECTED SUBJECT
              </Text>

              <Text style={styles.subjectName}>
                {subjectInfo.name || selectedSubject}
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={22}
              color={COLORS.success}
            />
          </View>

          {/* Difficulty Introduction */}
          <LinearGradient
            colors={COLORS.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.difficultyHero}
          >
            <View style={styles.difficultyHeroIcon}>
              <Ionicons
                name="game-controller"
                size={25}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.difficultyHeroContent}>
              <Text style={styles.difficultyHeroTitle}>
                Choose Your Difficulty
              </Text>

              <Text style={styles.difficultyHeroText}>
                The harder the maze, the faster the ghosts
                and the greater your coin rewards.
              </Text>
            </View>

            <View style={styles.difficultyHeroBadge}>
              <Ionicons
                name="trophy"
                size={14}
                color={COLORS.accent}
              />

              <Text style={styles.difficultyHeroBadgeText}>
                PLAY • LEARN • EARN
              </Text>
            </View>
          </LinearGradient>

          {/* Difficulty Title */}
          <View style={styles.titleSection}>
            <Text style={styles.difficultyTitle}>
              Select a difficulty
            </Text>

            <Text style={styles.difficultySubtitle}>
              Choose the challenge that matches your skill level.
            </Text>
          </View>

          {/* Difficulty Cards */}
          <View style={styles.difficultyList}>
            {DIFFICULTIES.map(difficulty => {
              const difficultyTheme = {
                easy: {
                  color: COLORS.success,
                  icon: difficulty.icon || '🟢',
                  ionicon: 'leaf',
                },

                medium: {
                  color: COLORS.accent,
                  icon: difficulty.icon || '🟡',
                  ionicon: 'flash',
                },

                hard: {
                  color: COLORS.error || '#E85D5D',
                  icon: difficulty.icon || '🔴',
                  ionicon: 'flame',
                },

                expert: {
                  color: '#A98BFF',
                  icon: difficulty.icon || '🟣',
                  ionicon: 'skull',
                },
              }[difficulty.id] || {
                color: COLORS.primary,
                icon: difficulty.icon || '🎮',
                ionicon: 'game-controller',
              };

              return (
                <TouchableOpacity
                  key={difficulty.id}
                  activeOpacity={0.85}
                  style={[
                    styles.difficultyCard,
                    {
                      borderColor: difficultyTheme.color,
                    },
                  ]}
                  onPress={() => chooseDifficulty(difficulty)}
                >
                  <View
                    style={[
                      styles.difficultyIconBox,
                      {
                        backgroundColor: difficultyTheme.color,
                      },
                    ]}
                  >
                    <Text style={styles.difficultyIcon}>
                      {difficultyTheme.icon}
                    </Text>

                    <View style={styles.difficultyIonIcon}>
                      <Ionicons
                        name={difficultyTheme.ionicon}
                        size={12}
                        color={COLORS.white}
                      />
                    </View>
                  </View>

                  <View style={styles.difficultyInfo}>
                    <View style={styles.difficultyNameRow}>
                      <Text style={styles.difficultyName}>
                        {difficulty.name}
                      </Text>

                      <View
                        style={[
                          styles.difficultyTag,
                          {
                            backgroundColor: difficultyTheme.color,
                          },
                        ]}
                      >
                        <Text style={styles.difficultyTagText}>
                          {difficulty.id.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.difficultyDescription}>
                      {getDifficultyDescription(difficulty)}
                    </Text>

                    <View style={styles.statsRow}>
                      <View style={styles.statPill}>
                        <Ionicons
                          name="skull"
                          size={11}
                          color={difficultyTheme.color}
                        />

                        <Text
                          style={[
                            styles.stat,
                            {
                              color: difficultyTheme.color,
                            },
                          ]}
                        >
                          Ghosts
                        </Text>
                      </View>

                      <View style={styles.statPill}>
                        <Text style={styles.statCoin}>
                          🪙
                        </Text>

                        <Text
                          style={[
                            styles.stat,
                            {
                              color: difficultyTheme.color,
                            },
                          ]}
                        >
                          +{difficulty.coinReward || 2}
                        </Text>
                      </View>

                      <View style={styles.statPill}>
                        <Ionicons
                          name="speedometer"
                          size={11}
                          color={difficultyTheme.color}
                        />

                        <Text
                          style={[
                            styles.stat,
                            {
                              color: difficultyTheme.color,
                            },
                          ]}
                        >
                          {difficulty.ghostSpeed || 650}ms
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.difficultyArrow,
                      {
                        backgroundColor: difficultyTheme.color,
                      },
                    ]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={COLORS.white}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reward Banner */}
          <View style={styles.difficultyRewardBanner}>
            <View style={styles.rewardIconBox}>
              <Ionicons
                name="trophy"
                size={24}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.rewardBannerContent}>
              <Text style={styles.rewardBannerTitle}>
                Bigger challenge, bigger rewards
              </Text>

              <Text style={styles.rewardBannerText}>
                Complete quizzes and collect coins while
                making your way through the maze.
              </Text>
            </View>

            <Text style={styles.rewardBannerCoin}>
              🪙
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }


  /* ========================================================
     GAME SCREEN
  ======================================================== */

  const grid = gridRef.current || [];
  const ROWS = grid.length;
  const COLS = grid[0]?.length || 1;

  if (ROWS === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingIcon}>🎮</Text>
        <Text style={styles.loadingTitle}>Preparing Maze...</Text>
        <Text style={styles.loadingText}>
          Loading your {subjectInfo.name || selectedSubject} maze.
        </Text>
      </View>
    );
  }

  const availableWidth = Math.min(width - 36, 420);
  const availableHeight = Math.min(height * 0.40, 500);

  const cellSize = Math.max(
    12,
    Math.min(
      24,
      Math.floor(
        Math.min(availableWidth / COLS, availableHeight / ROWS)
      )
    )
  );

  const mazeWidth = COLS * cellSize;
  const mazeHeight = ROWS * cellSize;
  const player = playerRef.current;
  const ghosts = ghostsRef.current;

  const questionsAnswered = quizAnsweredRef.current;
  const questionsTotal = quizTotalRef.current;


  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={backToDashboard}
          >
            <Ionicons
              name="chevron-back"
              size={21}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.gameHeaderInfo}>
            <Text style={styles.gameTitle}>🎮 Study Maze</Text>
            <Text style={styles.gameSubtitle}>
              {subjectInfo.name || selectedSubject}
              {' • '}
              {difficultyInfo.name}
            </Text>
          </View>
        </View>

        <View style={styles.currentGameHeader}>
          <View style={styles.currentSubjectBadge}>
            <Text style={styles.currentSubjectIcon}>
              {subjectInfo.icon || DEFAULT_SUBJECT_ICON}
            </Text>

            <View>
              <Text style={styles.currentGameLabel}>CURRENT MAZE</Text>
              <Text style={styles.currentSubjectName}>
                {subjectInfo.name || selectedSubject}
              </Text>
            </View>
          </View>

          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>
              {difficultyInfo.icon} {difficultyInfo.name}
            </Text>
          </View>
        </View>

        <View style={styles.hud}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>LIVES</Text>
            <Text style={styles.hudValue}>
              {'♥ '.repeat(Math.max(0, lives))}
            </Text>
          </View>

          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>SCORE</Text>
            <Text style={styles.hudValue}>{score}</Text>
          </View>

          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>COINS</Text>
            <Text style={styles.hudValue}>🪙 {coins}</Text>
          </View>

          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>QUESTIONS</Text>
            <Text style={styles.hudValue}>
              ❓ {questionsAnswered}/{questionsTotal}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => setPaused(true)}
            disabled={quizVisible || gameFinished}
          >
            <Text style={styles.pauseText}>⏸</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.mazeOuter,
            {
              width: mazeWidth + 16,
              height: mazeHeight + 16,
            },
          ]}
        >
          <View
            style={{
              width: mazeWidth,
              height: mazeHeight,
              position: 'relative',
            }}
          >
            {grid.map((row, r) =>
              row.map((value, c) => {
                const cellKey = `${r}-${c}`;

                const cellStyle = {
                  position: 'absolute',
                  left: c * cellSize,
                  top: r * cellSize,
                  width: cellSize,
                  height: cellSize,
                  alignItems: 'center',
                  justifyContent: 'center',
                };

                if (value === WALL) {
                  return (
                    <View
                      key={cellKey}
                      style={[styles.wall, cellStyle]}
                    />
                  );
                }

                if (value === COIN) {
                  return (
                    <View key={cellKey} style={cellStyle}>
                      <View
                        style={[
                          styles.coin,
                          {
                            width: Math.max(4, cellSize * 0.22),
                            height: Math.max(4, cellSize * 0.22),
                            borderRadius: cellSize * 0.11,
                          },
                        ]}
                      />
                    </View>
                  );
                }

                if (value === QUIZ) {
                  return (
                    <View key={cellKey} style={cellStyle}>
                      <View
                        style={[
                          styles.quizNode,
                          {
                            width: cellSize * 0.72,
                            height: cellSize * 0.72,
                            borderRadius: cellSize * 0.36,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.quizMark,
                            {
                              fontSize: Math.max(8, cellSize * 0.42),
                            },
                          ]}
                        >
                          ?
                        </Text>
                      </View>
                    </View>
                  );
                }

                return <View key={cellKey} style={cellStyle} />;
              })
            )}

            {ghosts.map((ghost, index) => (
              <View
                key={`ghost-${index}`}
                style={{
                  position: 'absolute',
                  left: ghost.c * cellSize,
                  top: ghost.r * cellSize,
                  width: cellSize,
                  height: cellSize,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: Math.max(13, cellSize * 0.8),
                  }}
                >
                  👻
                </Text>
              </View>
            ))}

            <View
              style={{
                position: 'absolute',
                left: player.c * cellSize + cellSize * 0.18,
                top: player.r * cellSize + cellSize * 0.18,
                width: cellSize * 0.64,
                height: cellSize * 0.64,
                borderRadius: cellSize * 0.32,
                backgroundColor: COLORS.primary,
              }}
            />
          </View>
        </View>

        <Text style={styles.mapDescription}>
          {mazeRef.current?.desc ||
            'Collect all coins to win! Quiz nodes are optional bonus challenges.'}
        </Text>

        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => tryMove(...DIRECTIONS.up)}
              disabled={paused || quizVisible}
            >
              <Text style={styles.controlText}>▲</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => tryMove(...DIRECTIONS.left)}
              disabled={paused || quizVisible}
            >
              <Text style={styles.controlText}>◀</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => tryMove(...DIRECTIONS.down)}
              disabled={paused || quizVisible}
            >
              <Text style={styles.controlText}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => tryMove(...DIRECTIONS.right)}
              disabled={paused || quizVisible}
            >
              <Text style={styles.controlText}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.keyboardHint}>
          Keyboard: WASD / Arrow Keys • P = Pause
        </Text>
      </ScrollView>

      <Modal
        visible={quizVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quizCard}>
            {quizLoading || !quizQuestion ? (
              <View style={styles.quizLoadingBox}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                />
                <Text style={styles.quizLoadingText}>
                  Loading question from QuizAPI...
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.quizHeader}>
                  {subjectInfo.icon} {subjectInfo.name}
                </Text>

                <Text style={styles.quizDifficulty}>
                  {difficultyInfo.icon} {difficultyInfo.name}
                  {' • QUIZ NODE'}
                </Text>

                <Text style={styles.question}>{quizQuestion.q}</Text>

                {quizQuestion.opts.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.answerButton}
                    onPress={() => answerQuiz(index)}
                    disabled={!!quizFeedback}
                  >
                    <View style={styles.answerLetter}>
                      <Text style={styles.answerLetterText}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>

                    <Text style={styles.answerText}>{option}</Text>
                  </TouchableOpacity>
                ))}

                {quizFeedback ? (
                  <Text style={styles.feedback}>{quizFeedback}</Text>
                ) : (
                  <Text style={styles.questionHint}>
                    Choose an answer to continue.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={paused}
        transparent
        animationType="fade"
        onRequestClose={() => setPaused(false)}
      >
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseIcon}>⏸</Text>

            <Text style={styles.pauseTitle}>GAME PAUSED</Text>

            <Text style={styles.pauseSubtitle}>
              {subjectInfo.icon} {subjectInfo.name}
              {'\n'}
              {difficultyInfo.icon} {difficultyInfo.name}
            </Text>

            <TouchableOpacity
              style={styles.resumeButton}
              onPress={() => setPaused(false)}
            >
              <Text style={styles.resumeText}>▶ RESUME</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restartButton}
              onPress={restartGame}
            >
              <Text style={styles.restartText}>↻ RESTART LEVEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exitButton}
              onPress={() => {
                setPaused(false);
                backToDashboard();
              }}
            >
              <Text style={styles.exitText}>EXIT TO SUBJECTS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


/* ==========================================================
   STYLES
========================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  content: {
    padding: 20,
    paddingTop: 45,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingIcon: {
    fontSize: 44,
    marginBottom: 12,
  },

  loadingTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  backButton: {
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

  headerInfo: {
    flex: 1,
  },

  title: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 18,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  hero: {
    minHeight: 155,
    borderRadius: 22,
    marginBottom: 18,
    padding: 18,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  heroContent: {
    maxWidth: '75%',
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
  },

  heroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  heroBadge: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  heroBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },

  searchSection: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    ...SHADOWS.small,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 3,
    marginBottom: 10,
  },

  searchIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  searchInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 11,
  },

  searchButton: {
    width: 45,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchError: {
    color: COLORS.error || '#E85D5D',
    fontSize: 9,
    marginTop: 8,
    fontWeight: '800',
  },

  searchResultCard: {
    marginTop: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  resultInfo: {
    flex: 1,
  },

  resultSubject: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },

  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  availableText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '800',
  },

  unavailableText: {
    color: COLORS.error || '#E85D5D',
    fontSize: 9,
    fontWeight: '800',
  },

  resultMeta: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 8,
  },

  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },

  favoriteButtonActive: {
    backgroundColor: COLORS.primary,
  },

  favoriteButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },

  favoriteButtonTextActive: {
    color: COLORS.white,
  },

  playSubjectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },

  playSubjectText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  favoritesSection: {
    marginBottom: 20,
  },

  favoriteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  favoriteHeaderInfo: {
    flex: 1,
  },

  favoriteCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteCountText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
  },

  emptyFavorites: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  emptyFavoriteTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyFavoriteText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 5,
  },

  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 9,
    marginBottom: 9,
    ...SHADOWS.small,
  },

  favoriteMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  favoriteIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  favoriteIcon: {
    fontSize: 20,
  },

  favoriteInfo: {
    flex: 1,
  },

  favoriteName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },

  favoriteMeta: {
    color: COLORS.textSecondary,
    fontSize: 8,
    marginTop: 2,
  },

  removeFavoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },

  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },

  subjectIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  subjectIcon: {
    fontSize: 27,
  },

  subjectInfo: {
    flex: 1,
  },

  subjectLabel: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  subjectName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  titleSection: {
    marginBottom: 15,
  },

  difficultyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },

  difficultySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  difficultyList: {
    gap: 10,
  },

  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 13,
    borderWidth: 2,
    ...SHADOWS.small,
  },

  difficultyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },

  difficultyIcon: {
    fontSize: 25,
  },

  difficultyIonIcon: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(26,16,48,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  difficultyInfo: {
    flex: 1,
  },

  difficultyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  difficultyName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  difficultyTag: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 5,
  },

  difficultyTagText: {
    color: COLORS.white,
    fontSize: 6,
    fontWeight: '900',
  },

  difficultyDescription: {
    color: COLORS.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },

  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  stat: {
    fontSize: 8,
    fontWeight: '900',
  },

  statCoin: {
    fontSize: 9,
  },

  difficultyArrow: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  difficultyRewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inkDark,
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
    gap: 10,
  },

  rewardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardBannerContent: {
    flex: 1,
  },

  rewardBannerTitle: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  rewardBannerText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 8,
    lineHeight: 12,
    marginTop: 3,
  },

  rewardBannerCoin: {
    fontSize: 20,
  },

  /* ========================================================
     GAME SCREEN EXTRAS
  ======================================================== */

  gameHeaderInfo: {
    flex: 1,
  },

  gameTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },

  gameSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },

  currentGameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  currentSubjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  currentSubjectIcon: {
    fontSize: 20,
    marginRight: 7,
  },

  currentGameLabel: {
    color: COLORS.textTertiary,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },

  currentSubjectName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 1,
  },

  difficultyBadge: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    ...SHADOWS.small,
  },

  difficultyText: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: '900',
  },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
    ...SHADOWS.small,
  },

  hudItem: {
    flex: 1,
    alignItems: 'center',
  },

  hudLabel: {
    color: COLORS.textTertiary,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  hudValue: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  pauseButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pauseText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  mazeOuter: {
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },

  wall: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 3,
    margin: 1,
  },

  coin: {
    backgroundColor: COLORS.accent,
  },

  quizNode: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quizMark: {
    color: COLORS.white,
    fontWeight: '900',
  },

  mapDescription: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 10,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 15,
  },

  controls: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },

  controlButton: {
    width: 60,
    height: 54,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  controlText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },

  keyboardHint: {
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontSize: 9,
    marginTop: 8,
    marginBottom: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,48,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  quizCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.large,
  },

  quizLoadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quizLoadingText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 12,
    fontWeight: '800',
  },

  quizHeader: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },

  quizDifficulty: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 0.5,
  },

  question: {
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 16,
    fontWeight: '700',
  },

  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },

  answerLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  answerLetterText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  answerText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    flex: 1,
  },

  feedback: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '800',
  },

  questionHint: {
    color: COLORS.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },

  pauseOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,48,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  pauseCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    ...SHADOWS.large,
  },

  pauseIcon: {
    textAlign: 'center',
    fontSize: 40,
    marginBottom: 8,
  },

  pauseTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  pauseSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },

  resumeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  resumeText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
  },

  restartButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  restartText: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 13,
  },

  exitButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.error || '#E85D5D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  exitText: {
    color: COLORS.error || '#E85D5D',
    fontWeight: '900',
    fontSize: 13,
  },

  difficultyHero: {
    minHeight: 145,
    borderRadius: 22,
    marginBottom: 20,
    padding: 18,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  difficultyHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  difficultyHeroContent: {
    maxWidth: '82%',
  },

  difficultyHeroTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
  },

  difficultyHeroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },

  difficultyHeroBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  difficultyHeroBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
  },
});