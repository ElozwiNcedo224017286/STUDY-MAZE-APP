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
  Animated,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // npx expo install expo-haptics

import styles from './mazeStyles';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

import { SUBJECTS, DIFFICULTIES, getSubjectIcon, getRandomMaze, prepareMazeMap, findSubject,} from './mazeData.js';

import { buildActiveQuestionPool } from './quizBank';

import { searchQuizAPISubject, getQuizBank, SUGGESTION_TOPICS,} from '../api/questions';


/* ==========================================================
   ARTWORK  (adjust the paths if your assets live elsewhere)
========================================================== */

const GHOST_IMAGE = require('../../assets/Artwork/maze-reward-chest.png');
const PLAYER_IMAGE = require('../../assets/Artwork/maze-ghost-cute.png');
const GOAL_IMAGE = require('../../assets/Artwork/maze-goal-checklist.png');

/* Set to false if your player artwork faces LEFT by default. */
const PLAYER_IMAGE_FACES_RIGHT = true;


/* ==========================================================
   STORAGE KEYS
========================================================== */

const FAVORITES_STORAGE_KEY = '@study_maze_favorite_subjects';
const SETTINGS_STORAGE_KEY = '@study_maze_settings';
const PROGRESS_STORAGE_KEY = '@study_maze_progress';
const QUESTION_CACHE_PREFIX = '@study_maze_qcache:';

const RECENT_SEARCHES_KEY = '@study_maze_recent_searches';
const MAX_RECENTS = 5;
const MAX_SUGGESTIONS = 6;

const SUGGESTION_ICONS = {
  favorite: '⭐',
  subject: '📚',
  recent: '🕘',
  topic: '🔎',
};

const SUGGESTION_TAGS = {
  favorite: 'Favorite',
  subject: 'Subject',
  recent: 'Recent',
  topic: 'Topic',
};


/* ==========================================================
   GRID VALUES
========================================================== */

const WALL = 1;
const COIN = 0;
const QUIZ = 2;
const VISITED = 3;

/* Power-up cells (placed on former coin cells) */
const CELL_PELLET = 4; // ghosts become edible
const CELL_FREEZE = 5; // ghosts freeze
const CELL_SHIELD = 6; // absorbs one hit
const CELL_LIFE = 7;   // extra life
const CELL_FIFTY = 8;  // 50/50 token for quizzes
const CELL_SKIP = 9;   // skip-question token

const POWER_CELLS = [
  CELL_PELLET,
  CELL_FREEZE,
  CELL_SHIELD,
  CELL_LIFE,
  CELL_FIFTY,
  CELL_SKIP,
];

const POWER_ICONS = {
  [CELL_PELLET]: '⚡',
  [CELL_FREEZE]: '❄️',
  [CELL_SHIELD]: '🛡️',
  [CELL_LIFE]: '❤️',
  [CELL_FIFTY]: '½',
  [CELL_SKIP]: '⏭️',
};


/* ==========================================================
   DIRECTIONS
========================================================== */

const DIRECTIONS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const DIR_LIST = Object.values(DIRECTIONS);
const STOP = { dr: 0, dc: 0 };

const dirToDeg = (dr, dc) => {
  if (dc === 1) return 0;
  if (dr === 1) return 90;
  if (dc === -1) return 180;
  if (dr === -1) return 270;
  return 0;
};


/* ==========================================================
   DEFAULT SUBJECT ICON
========================================================== */

const DEFAULT_SUBJECT_ICON = '📚';


/* ==========================================================
   GAME TUNING
========================================================== */

const SWIPE_THRESHOLD = 16;   // px before a direction is recognised
const AXIS_BIAS = 1.2;        // diagonal drags must favour one axis by 20%
const JOYSTICK_DEADZONE = 14; // px
const JOYSTICK_RADIUS = 42;   // px (visual knob travel)
const TICK_MS = 40;           // single game loop resolution

/* Cells are taller than wide so the maze reads bigger vertically. */
const CELL_RATIO = 1.18;

/* Player speed per difficulty (ms per cell). Lower = faster. */
const PLAYER_STEP_BY_DIFFICULTY = {
  easy: 150,
  medium: 165,
  hard: 180,
  expert: 195,
};

const INVULN_MS = 2500;       // blinking safe time after respawn
const SHIELD_INVULN_MS = 1500;
const FRIGHT_MS = 7000;
const FREEZE_MS = 4000;
const GHOST_DEAD_MS = 5000;
const RESPAWN_MS = 900;

const CHASE_MS = 20000;       // ghosts chase this long...
const SCATTER_CYCLE_MS = 25000; // ...then scatter to corners for the rest

const QUIZ_TIME_MS = 15000;
const MAX_LIVES = 5;

const GHOST_TYPES = ['chaser', 'ambusher', 'patrol', 'wanderer'];

const DEFAULT_SETTINGS = {
  controlMode: 'swipe',  // 'swipe' | 'joystick' | 'dpad'
  dpadPosition: 'center', // 'left' | 'center' | 'right'
  largeButtons: false,
  showDpad: false,        // swipe is the main control, so more room for the maze
  showGoals: true,
  timerEnabled: false,
  feedback: true,         // haptics + sound hook
};

const DEFAULT_PROGRESS = {
  stars: {},
  best: {},
  top: {},
  achievements: {},
  wins: 0,
  daily: {},
};

const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', title: 'First Victory', desc: 'Win a maze' },
  { id: 'flawless', icon: '💎', title: 'Flawless', desc: 'Win without losing a life' },
  { id: 'streak_5', icon: '🔥', title: 'On Fire', desc: 'Answer 5 questions in a row correctly' },
  { id: 'quiz_ace', icon: '🎓', title: 'Quiz Ace', desc: 'Answer every question correctly (3 or more)' },
  { id: 'speed_runner', icon: '⚡', title: 'Speed Runner', desc: 'Earn 3 stars in one maze' },
  { id: 'power_user', icon: '🔋', title: 'Power User', desc: 'Collect 4 power-ups in one maze' },
  { id: 'ghost_hunter', icon: '👻', title: 'Ghost Hunter', desc: 'Eat 3 ghosts in one maze' },
  { id: 'daily_done', icon: '📅', title: 'Daily Player', desc: 'Win a daily challenge' },
  { id: 'level_3', icon: '🚀', title: 'Deep Diver', desc: 'Reach level 3' },
];


/* ==========================================================
   FEEDBACK HOOKS
========================================================== */

/**
 * Sound hook. Drop your audio engine in here (expo-audio, etc.) and
 * map these names to files: coin, turn, quiz, correct, wrong, power,
 * hit, win, lose. It is a no-op until you do.
 */
const playSound = name => {
  // Example:
  // const file = SOUND_FILES[name];
  // if (file) player.replace(file), player.play();
};

const buzz = fn => {
  try {
    Promise.resolve(fn()).catch(() => {});
  } catch (error) {
    /* haptics unavailable */
  }
};


/* ==========================================================
   PURE HELPERS
========================================================== */

const mulberry32 = seed => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashString = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const shuffleArray = (arr, rng = Math.random) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/* Runs fn with a seeded Math.random (used for the daily challenge). */
const withSeededRandom = (seed, fn) => {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const progressKey = (subject, difficulty) =>
  `${String(subject || '').toLowerCase()}|${difficulty || ''}`;

const questionCacheKey = (subject, difficulty) =>
  `${QUESTION_CACHE_PREFIX}${String(subject || '').toLowerCase()}:${
    difficulty || ''
  }`;

const readQuestionCache = async key => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.questions) ? parsed.questions : [];
  } catch (error) {
    return [];
  }
};

/* Local question bank, whichever export name quizBank.js uses. */
const buildLocalPool = (teacherQuestions, subject, difficulty) => {
  try {
    return buildActiveQuestionPool(teacherQuestions || [], subject, difficulty);
  } catch (error) {
    console.log('Local question bank failed:', error);
    return [];
  }
};

/* De-duplicates, validates and shuffles a question list. */
const preparePool = (raw, rng = Math.random) => {
  const seen = new Set();
  const clean = (Array.isArray(raw) ? raw : []).filter(item => {
    if (!item || !Array.isArray(item.opts) || item.opts.length < 2) {
      return false;
    }
    const key = String(item.q || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return shuffleArray(clean, rng);
};

/* Shuffles the answer order and re-maps the correct index. */
const shuffleQuestion = question => {
  if (!question || !Array.isArray(question.opts) || question.opts.length < 2) {
    return question;
  }
  const order = shuffleArray(question.opts.map((_, i) => i));
  return {
    ...question,
    opts: order.map(i => question.opts[i]),
    correct: order.indexOf(question.correct),
  };
};

const getExplanation = question =>
  question?.explanation || question?.exp || question?.rationale || '';

/* One step on the grid, with optional wrap-around tunnels. */
const stepCell = (grid, r, c, dr, dc) => {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  if (!rows || !cols) return null;

  let nr = r + dr;
  let nc = c + dc;

  if (nr < 0) nr = rows - 1;
  else if (nr >= rows) nr = 0;

  if (nc < 0) nc = cols - 1;
  else if (nc >= cols) nc = 0;

  if (grid[nr][nc] === WALL) return null;
  return { r: nr, c: nc };
};

/* BFS: first step [dr, dc] along the shortest path from -> to. */
const bfsFirstStep = (grid, from, to) => {
  if (!from || !to) return null;
  if (from.r === to.r && from.c === to.c) return null;

  const rows = grid.length;
  const cols = grid[0].length;
  const seen = new Uint8Array(rows * cols);
  const queue = [];

  seen[from.r * cols + from.c] = 1;

  for (const [dr, dc] of DIR_LIST) {
    const n = stepCell(grid, from.r, from.c, dr, dc);
    if (!n) continue;
    const k = n.r * cols + n.c;
    if (seen[k]) continue;
    seen[k] = 1;
    queue.push({ r: n.r, c: n.c, dr, dc });
  }

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head];
    head += 1;

    if (cur.r === to.r && cur.c === to.c) return [cur.dr, cur.dc];

    for (const [dr, dc] of DIR_LIST) {
      const n = stepCell(grid, cur.r, cur.c, dr, dc);
      if (!n) continue;
      const k = n.r * cols + n.c;
      if (seen[k]) continue;
      seen[k] = 1;
      queue.push({ r: n.r, c: n.c, dr: cur.dr, dc: cur.dc });
    }
  }

  return null;
};

/* Nearest open cell to each corner (used as scatter targets). */
const computeCorners = grid => {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const targets = [
    [0, 0],
    [0, cols - 1],
    [rows - 1, 0],
    [rows - 1, cols - 1],
  ];

  return targets.map(([tr, tc]) => {
    let best = { r: 1, c: 1 };
    let bestDist = Infinity;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c] === WALL) continue;
        const d = Math.abs(r - tr) + Math.abs(c - tc);
        if (d < bestDist) {
          bestDist = d;
          best = { r, c };
        }
      }
    }
    return best;
  });
};

const buildGhosts = maze =>
  (maze?.ghostStarts || []).map((ghost, i) => ({
    ...ghost,
    homeR: ghost.r,
    homeC: ghost.c,
    type: GHOST_TYPES[i % GHOST_TYPES.length],
    lastDir: null,
    deadUntil: 0,
  }));

const manhattan = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

const starsText = n => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));


/* ==========================================================
   MEMOIZED MAZE ROW
   Rows are replaced (new array) whenever a cell changes, so
   only that row re-renders.
========================================================== */

const MazeRow = React.memo(function MazeRow({ row, r, cellW, cellH }) {
  const m = Math.min(cellW, cellH);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: r * cellH,
        width: row.length * cellW,
        height: cellH,
        flexDirection: 'row',
      }}
    >
      {row.map((value, c) => {
        const cellStyle = {
          width: cellW,
          height: cellH,
          alignItems: 'center',
          justifyContent: 'center',
        };

        if (value === WALL) {
          return (
            <View key={c} style={cellStyle}>
              <View
                style={[
                  styles.wall,
                  { width: cellW - 2, height: cellH - 2 },
                ]}
              />
            </View>
          );
        }

        if (value === COIN) {
          const dot = Math.max(5, m * 0.28);
          return (
            <View key={c} style={cellStyle}>
              <View
                style={[
                  styles.coin,
                  {
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                  },
                ]}
              />
            </View>
          );
        }

        if (value === QUIZ) {
          const node = Math.max(13, m * 0.78);
          return (
            <View key={c} style={cellStyle}>
              <View
                style={[
                  styles.quizNode,
                  {
                    width: node,
                    height: node,
                    borderRadius: node / 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quizMark,
                    { fontSize: Math.max(8, node * 0.55) },
                  ]}
                >
                  ?
                </Text>
              </View>
            </View>
          );
        }

        if (POWER_ICONS[value]) {
          return (
            <View key={c} style={cellStyle}>
              <Text
                style={[
                  styles.powerCell,
                  { fontSize: Math.max(9, m * 0.66) },
                ]}
              >
                {POWER_ICONS[value]}
              </Text>
            </View>
          );
        }

        return <View key={c} style={cellStyle} />;
      })}
    </View>
  );
});


/* ==========================================================
   GHOST SPRITE (artwork, smooth movement, fear/freeze tint)
========================================================== */

const GhostSprite = React.memo(function GhostSprite({
  r,
  c,
  w,
  h,
  duration,
  mode,
  dead,
}) {
  const pos = useRef(
    new Animated.ValueXY({ x: c * w, y: r * h })
  ).current;
  const last = useRef({ x: c * w, y: r * h });

  useEffect(() => {
    const tx = c * w;
    const ty = r * h;
    const l = last.current;

    if (l.x === tx && l.y === ty) return;

    const far =
      Math.abs(tx - l.x) > w * 1.5 || Math.abs(ty - l.y) > h * 1.5;

    last.current = { x: tx, y: ty };

    if (far) {
      pos.stopAnimation();
      pos.setValue({ x: tx, y: ty });
    } else {
      Animated.timing(pos, {
        toValue: { x: tx, y: ty },
        duration,
        useNativeDriver: true,
      }).start();
    }
  }, [r, c, w, h, duration, pos]);

  const tint =
    mode === 'scared' ? '#4DA3FF' : mode === 'frozen' ? '#9AD7FF' : undefined;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: dead ? 0 : mode === 'scared' ? 0.85 : 1,
        transform: pos.getTranslateTransform(),
      }}
    >
      <Image
        source={GHOST_IMAGE}
        style={{ width: w + 10, height: w + 10, tintColor: tint }}
        resizeMode="contain"
      />
      {mode === 'frozen' ? (
        <Text style={{ position: 'absolute', fontSize: Math.max(10, w * 0.6) }}>
          ❄️
        </Text>
      ) : null}
    </Animated.View>
  );
});


/* ==========================================================
   PLAYER SPRITE (artwork, flips to face left/right, blink,
   shield ring, death shrink)
========================================================== */

function PlayerSprite({ anim, w, h, flip, blink, shield, dying }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (dying) {
      Animated.timing(scale, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }).start();
    } else {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [dying, scale]);

  const img = w + 14;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: blink ? 0.35 : 1,
        transform: [...anim.getTranslateTransform(), { scale }],
      }}
    >
      <View
        style={{
          width: img,
          height: img,
          borderRadius: img / 2,
          borderWidth: shield ? 2 : 0,
          borderColor: COLORS.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={PLAYER_IMAGE}
          style={{
            width: img - (shield ? 4 : 0),
            height: img - (shield ? 4 : 0),
            transform: [{ scaleX: flip ? -1 : 1 }],
          }}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}


/* ==========================================================
   EFFECTS: floating text + particle burst
========================================================== */

const FloatingText = React.memo(function FloatingText({
  id,
  text,
  color,
  x,
  y,
  size,
  onDone,
}) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 850,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone(id);
    });
  }, [p, id, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y,
        width: size * 2,
        alignItems: 'center',
        opacity: p.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 1, 0],
        }),
        transform: [
          {
            translateY: p.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -size * 1.4],
            }),
          },
        ],
      }}
    >
      <Text
        style={{
          color,
          fontWeight: '900',
          fontSize: Math.max(10, size * 0.6),
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
});

const BURST_DOTS = 8;

const Burst = React.memo(function Burst({ id, color, x, y, w, h, onDone }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone(id);
    });
  }, [p, id, onDone]);

  const dots = [];
  for (let i = 0; i < BURST_DOTS; i += 1) {
    const angle = (i / BURST_DOTS) * Math.PI * 2;
    dots.push(
      <Animated.View
        key={i}
        style={{
          position: 'absolute',
          left: x + w / 2 - 3,
          top: y + h / 2 - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
          opacity: p.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [
            {
              translateX: p.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.cos(angle) * w * 1.3],
              }),
            },
            {
              translateY: p.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.sin(angle) * w * 1.3],
              }),
            },
          ],
        }}
      />
    );
  }

  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{dots}</View>;
});


/* ==========================================================
   QUIZ TIMER BAR (own state, so the screen doesn't re-render)
========================================================== */

function QuizTimerBar({ active, resetKey, durationMs, timeLeftRef, onExpire }) {
  const [left, setLeft] = useState(durationMs);

  useEffect(() => {
    timeLeftRef.current = durationMs;
    setLeft(durationMs);
  }, [resetKey, durationMs, timeLeftRef]);

  useEffect(() => {
    if (!active) return undefined;

    const id = setInterval(() => {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 100);
      setLeft(timeLeftRef.current);

      if (timeLeftRef.current <= 0) {
        clearInterval(id);
        onExpire();
      }
    }, 100);

    return () => clearInterval(id);
  }, [active, resetKey, onExpire, timeLeftRef]);

  const pct = Math.max(0, Math.min(1, left / durationMs));

  return (
    <View style={styles.timerTrack}>
      <View
        style={[
          styles.timerFill,
          {
            width: `${pct * 100}%`,
            backgroundColor: pct > 0.33 ? COLORS.primary : '#E85D5D',
          },
        ]}
      />
    </View>
  );
}


/* ==========================================================
   GOAL ROW (live checklist item)
========================================================== */

function GoalRow({ done, warn, icon, text }) {
  return (
    <View style={styles.goalRow}>
      {done ? (
        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
      ) : (
        icon
      )}
      <Text
        style={[
          styles.goalText,
          done && styles.goalTextDone,
          warn && styles.goalTextWarn,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

/* Lowercase, strip accents, collapse spaces: "  Géography " -> "geography" */
const fold = value =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/* 0 exact, 1 starts with, 2 a word starts with, 3 contains, -1 no match */
const scoreMatch = (label, query) => {
  const text = fold(label);
  if (text === query) return 0;
  if (text.startsWith(query)) return 1;
  if (text.split(' ').some(word => word.startsWith(query))) return 2;
  if (text.includes(query)) return 3;
  return -1;
};

/* sources: [{ type, items: [{ label, icon? }] }], earlier sources win ties. */
const buildSuggestions = (query, sources) => {
  const q = fold(query);
  if (!q) return [];

  const seen = new Set();
  const matches = [];

  sources.forEach((source, order) => {
    source.items.forEach(item => {
      const key = fold(item.label);
      if (!key || seen.has(key)) return;

      const score = scoreMatch(item.label, q);
      if (score < 0) return;

      seen.add(key);
      matches.push({
        ...item,
        type: source.type,
        key: `${source.type}-${key}`,
        score,
        order,
      });
    });
  });

  return matches.sort(
      (a, b) =>
        a.score - b.score ||
        a.order - b.order ||
        a.label.localeCompare(b.label)
  )
    .slice(0, MAX_SUGGESTIONS);
};

function HighlightedLabel({ label, query }) {
  const q = query.trim().toLowerCase();
  const i = q ? label.toLowerCase().indexOf(q) : -1;

  if (i < 0) return <Text style={styles.suggestionText}>{label}</Text>;

  return (
    <Text style={styles.suggestionText}>
      {label.slice(0, i)}
      <Text style={styles.suggestionMatch}>
        {label.slice(i, i + q.length)}
      </Text>
      {label.slice(i + q.length)}
    </Text>
  );
}


/* ==========================================================
   SETTINGS UI
========================================================== */

function OptionChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.optionChip, active && styles.optionChipActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionChipText,
          active && styles.optionChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, hint, value, onValueChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: COLORS.primary }}
      />
    </View>
  );
}

function SettingsModal({ visible, settings, onChange, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.pauseOverlay}>
        <View style={styles.settingsCard}>
          <Text style={styles.pauseTitle}>SETTINGS</Text>

          <ScrollView
            style={styles.settingsScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.settingsLabel}>CONTROLS</Text>
            <View style={styles.optionRow}>
              <OptionChip
                label="Swipe"
                active={settings.controlMode === 'swipe'}
                onPress={() => onChange({ controlMode: 'swipe' })}
              />
              <OptionChip
                label="Joystick"
                active={settings.controlMode === 'joystick'}
                onPress={() => onChange({ controlMode: 'joystick' })}
              />
              <OptionChip
                label="D-pad only"
                active={settings.controlMode === 'dpad'}
                onPress={() => onChange({ controlMode: 'dpad' })}
              />
            </View>

            <Text style={styles.settingsLabel}>D-PAD POSITION</Text>
            <View style={styles.optionRow}>
              <OptionChip
                label="Left"
                active={settings.dpadPosition === 'left'}
                onPress={() => onChange({ dpadPosition: 'left' })}
              />
              <OptionChip
                label="Center"
                active={settings.dpadPosition === 'center'}
                onPress={() => onChange({ dpadPosition: 'center' })}
              />
              <OptionChip
                label="Right"
                active={settings.dpadPosition === 'right'}
                onPress={() => onChange({ dpadPosition: 'right' })}
              />
            </View>

            <ToggleRow
              label="Show D-pad"
              hint="Always shown in D-pad only mode. Hiding it gives the maze more room."
              value={settings.showDpad || settings.controlMode === 'dpad'}
              onValueChange={value => onChange({ showDpad: value })}
            />

            <ToggleRow
              label="Large buttons"
              value={settings.largeButtons}
              onValueChange={value => onChange({ largeButtons: value })}
            />

            <ToggleRow
              label="Goals card"
              hint="Live checklist under the maze. Hide it for a bigger maze."
              value={settings.showGoals}
              onValueChange={value => onChange({ showGoals: value })}
            />

            <ToggleRow
              label="Answer timer"
              hint="15 seconds per question, with a speed bonus."
              value={settings.timerEnabled}
              onValueChange={value => onChange({ timerEnabled: value })}
            />

            <ToggleRow
              label="Haptics and sound"
              value={settings.feedback}
              onValueChange={value => onChange({ feedback: value })}
            />
          </ScrollView>

          <TouchableOpacity style={styles.resumeButton} onPress={onClose}>
            <Text style={styles.resumeText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


/* ==========================================================
   MAIN SCREEN
========================================================== */

export default function MazeGameScreen({ route, navigation }) {

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { recordGame } = useAuth();

  const topPad = insets.top + 16;

  
  const incomingSubject = route?.params?.selectedSubject || null;
  const incomingDifficulty = route?.params?.selectedDifficulty || null;
  const incomingLevel = route?.params?.startLevel || 1;


  /* ========================================================
     SCREEN FLOW
  ======================================================== */

  const [screenMode, setScreenMode] = useState(
    incomingSubject && incomingDifficulty
      ? 'game'
      : incomingSubject
      ? 'difficulty'
      : 'dashboard'
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);


  /* ========================================================
     FAVORITES
  ======================================================== */

  const [favoriteSubjects, setFavoriteSubjects] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then(raw => {
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setRecentSearches(parsed);
      })
      .catch(() => {});
  }, []);

  const rememberSearch = useCallback(term => {
    setRecentSearches(prev => {
      const next = [
        term,
        ...prev.filter(item => fold(item) !== fold(term)),
      ].slice(0, MAX_RECENTS);

      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });
  }, []);


  /* ========================================================
     SETTINGS + PROGRESS
  ======================================================== */

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);

  const settingsRef = useRef(DEFAULT_SETTINGS);
  const progressRef = useRef(DEFAULT_PROGRESS);
  const controlModeRef = useRef('swipe');

  settingsRef.current = settings;
  controlModeRef.current = settings.controlMode;


  /* ========================================================
     GAME REFS
  ======================================================== */

  const mazeRef = useRef(null);
  const gridRef = useRef(null);
  const playerRef = useRef({ r: 1, c: 1 });
  const ghostsRef = useRef([]);
  const cornersRef = useRef([]);
  const livesRef = useRef(3);
  const livesLostRef = useRef(0);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const levelStartCoinsRef = useRef(0);
  const runningRef = useRef(false);
  const gameFinishedRef = useRef(false);
  const awaitingQuizRef = useRef(false);
  const currentQuizCellRef = useRef(null);

  /* Quiz pool is NEVER drained — we cycle through it. */
  const quizPoolRef = useRef([]);
  const quizIndexRef = useRef(0);
  const pendingPoolRef = useRef(null);
  const missedRef = useRef([]);
  const missedQueueRef = useRef([]);

  const coinsRemainingRef = useRef(0);
  const coinsTotalRef = useRef(0);
  const quizAnsweredRef = useRef(0);
  const quizTotalRef = useRef(0);
  const correctCountRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);

  /* Power-up refs */
  const shieldRef = useRef(0);
  const fiftyRef = useRef(0);
  const skipRef = useRef(0);
  const powerCollectedRef = useRef(0);
  const ghostsEatenRef = useRef(0);
  const frightenedUntilRef = useRef(0);
  const freezeUntilRef = useRef(0);
  const invulnUntilRef = useRef(0);

  /* Run / level refs */
  const levelRef = useRef(incomingLevel);
  const carryRef = useRef({ score: 0, coins: 0 });
  const dailyActiveRef = useRef(false);

  /* Loop / clock refs */
  const clockRef = useRef(0);
  const playTimeRef = useRef(0);
  const playerAccRef = useRef(0);
  const ghostAccRef = useRef(0);
  const animAccRef = useRef(0);
  const ghostStepCountRef = useRef(0);
  const respawnRef = useRef(0);
  const tickRef = useRef(null);
  const playerStepRef = useRef(170);
  const ghostStepRef = useRef(650);

  /* Input / movement refs */
  const currentDirRef = useRef(STOP);
  const desiredDirRef = useRef(STOP);
  const facingDirRef = useRef({ dr: 0, dc: 1 });
  const facingDegRef = useRef(0);
  const flipRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const pausedRef = useRef(false);
  const quizVisibleRef = useRef(false);
  const tryMoveRef = useRef(null);
  const cellWRef = useRef(0);
  const cellHRef = useRef(0);
  const lastAnimTargetRef = useRef(null);
  const timeLeftRef = useRef(QUIZ_TIME_MS);
  const answerQuizRef = useRef(null);
  const setupGameRef = useRef(null);
  const fxIdRef = useRef(0);
  const playerAnim = useRef(
    new Animated.ValueXY({ x: 0, y: 0 })
  ).current;

  /* Joystick visuals */
  const joyOpacity = useRef(new Animated.Value(0)).current;
  const joyBase = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const joyKnob = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const resetDirections = useCallback(() => {
    currentDirRef.current = STOP;
    desiredDirRef.current = STOP;
  }, []);


  /* ========================================================
     GAME STATE
  ======================================================== */

  const [, forceRender] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [quizPicked, setQuizPicked] = useState(null);
  const [quizSerial, setQuizSerial] = useState(0);
  const [hiddenOpts, setHiddenOpts] = useState([]);
  const [gameFinished, setGameFinished] = useState(false);
  const [dying, setDying] = useState(false);
  const [level, setLevel] = useState(1);
  const [shield, setShield] = useState(false);
  const [fiftyCount, setFiftyCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fx, setFx] = useState([]);
  const [review, setReview] = useState(null);

  /* Mirror state into refs so gesture handlers never go stale. */
  pausedRef.current = paused;
  quizVisibleRef.current = quizVisible;


  const refresh = useCallback(() => {
    forceRender(value => value + 1);
  }, []);


  /* ========================================================
     FEEDBACK + EFFECTS HELPERS
  ======================================================== */

  const feedback = useCallback(kind => {
    if (!settingsRef.current.feedback) return;

    playSound(kind);

    if (Platform.OS === 'web') return;

    switch (kind) {
      case 'turn':
        buzz(() => Haptics.selectionAsync());
        break;
      case 'quiz':
      case 'power':
        buzz(() =>
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        );
        break;
      case 'hit':
        buzz(() =>
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          )
        );
        break;
      case 'correct':
      case 'win':
        buzz(() =>
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          )
        );
        break;
      case 'wrong':
        buzz(() =>
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          )
        );
        break;
      default:
        break; // 'coin' etc: sound hook only
    }
  }, []);

  const addFx = useCallback((type, r, c, opts = {}) => {
    fxIdRef.current += 1;
    const item = { id: fxIdRef.current, type, r, c, ...opts };
    setFx(prev => [...prev.slice(-10), item]);
  }, []);

  const removeFx = useCallback(id => {
    setFx(prev => prev.filter(item => item.id !== id));
  }, []);

  const commitProgress = useCallback(updater => {
    const next = updater(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next)).catch(
      () => {}
    );
  }, []);

  const updateSettings = useCallback(patch => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });
  }, []);


  /* ========================================================
     LOAD FAVORITES / SETTINGS / PROGRESS
  ======================================================== */

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (mounted && stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setFavoriteSubjects(parsed);
        }
      } catch (error) {
        console.log('Could not load favorite subjects:', error);
      } finally {
        if (mounted) setFavoritesLoaded(true);
      }

      try {
        const storedSettings = await AsyncStorage.getItem(
          SETTINGS_STORAGE_KEY
        );
        if (mounted && storedSettings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...JSON.parse(storedSettings),
          });
        }
      } catch (error) {
        console.log('Could not load settings:', error);
      }

      try {
        const storedProgress = await AsyncStorage.getItem(
          PROGRESS_STORAGE_KEY
        );
        if (mounted && storedProgress) {
          const merged = {
            ...DEFAULT_PROGRESS,
            ...JSON.parse(storedProgress),
          };
          progressRef.current = merged;
          setProgress(merged);
        }
      } catch (error) {
        console.log('Could not load progress:', error);
      }
    };

    loadAll();

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
        icon: subjectData.icon ||findSubject(subjectData.name)?.icon || getSubjectIcon(subjectData.name) || DEFAULT_SUBJECT_ICON,
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


  const searchSubject = useCallback(
    async override => {
      // onPress / onSubmitEditing pass an event object, so only trust strings.
      const typed = (typeof override === 'string' ? override : subjectSearch).trim();

      if (!typed) {
        setSearchResult(null);
        setSearchError('Enter a subject to search.');
        return;
      }

      // "mathematics" / "PYTHON" -> the properly written name when we know it.
      const known = [
        ...SUBJECTS.map(item => item.name),
        ...favoriteSubjects.map(item => item.name),
        ...SUGGESTION_TOPICS,
      ].find(label => fold(label) === fold(typed));

      const term = known || typed;

      Keyboard.dismiss();
      setSearchFocused(false);
      setSubjectSearch(term);
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

        if (result.available) rememberSearch(result.subject || term);
        setSearchResult(result);
      } catch (error) {
        console.log('QuizAPI subject search failed:', error);
        setSearchError(error?.message || 'Unable to search QuizAPI.');
      } finally {
        setSearchingSubject(false);
      }
    },
    [subjectSearch, favoriteSubjects, rememberSearch]
  );

  const suggestions = useMemo(() => {
    if (!searchFocused || searchResult) return [];

    // Empty box: offer recent searches.
    if (!fold(subjectSearch)) {
      return recentSearches.map(label => ({
        key: `recent-${fold(label)}`,
        label,
        type: 'recent',
      }));
    }

    const list = buildSuggestions(subjectSearch, [
      {
        type: 'favorite',
        items: favoriteSubjects.map(f => ({ label: f.name, icon: f.icon })),
      },
      {
        type: 'subject',
        items: SUBJECTS.map(s => ({ label: s.name, icon: s.icon })),
      },
      { type: 'recent', items: recentSearches.map(label => ({ label })) },
      { type: 'topic', items: SUGGESTION_TOPICS.map(label => ({ label })) },
    ]);

    // Don't suggest exactly what is already typed.
    if (list.length === 1 && fold(list[0].label) === fold(subjectSearch)) {
      return [];
    }

    return list;
  }, [searchFocused, searchResult, subjectSearch, recentSearches, favoriteSubjects]);

  const pickSuggestion = useCallback(
    item => {
      searchSubject(item.label);
    },
    [searchSubject]
  );

  /* ========================================================
     SUBJECT + DIFFICULTY INFO
  ======================================================== */

  const subjectInfo = useMemo(() => {
    if (!selectedSubject) {
      return { id: '', name: '', shortName: '', icon: DEFAULT_SUBJECT_ICON };
    }

    const value = String(selectedSubject);

    return (
      findSubject(value) || {
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


  /* Daily challenge: same subject + maze for everyone on a given day. */
  const dailyDate = todayKey();

  const dailySubject = useMemo(() => {
    if (!SUBJECTS || SUBJECTS.length === 0) {
      return { name: 'General Knowledge', icon: DEFAULT_SUBJECT_ICON };
    }
    return SUBJECTS[hashString(dailyDate) % SUBJECTS.length];
  }, [dailyDate]);

  const dailyDifficultyId = useMemo(
    () =>
      DIFFICULTIES.find(item => item.id === 'medium')?.id ||
      DIFFICULTIES[0]?.id ||
      'easy',
    []
  );

  const dailyDone = progress.daily?.[dailyDate];


  /* ========================================================
     RUN / LEVEL FLOW
  ======================================================== */

  const startRun = useCallback(() => {
    levelRef.current = 1;
    carryRef.current = { score: 0, coins: 0 };
  }, []);


  const chooseSubject = useCallback(subjectName => {
    if (!subjectName) return;
    dailyActiveRef.current = false;
    quizPoolRef.current = [];
    pendingPoolRef.current = null;
    setSelectedSubject(subjectName);
    setSelectedDifficulty(null);
    setScreenMode('difficulty');
  }, []);


  const chooseDifficulty = useCallback(
    difficulty => {
      if (!selectedSubject || !difficulty?.id) return;
      dailyActiveRef.current = false;
      startRun();
      setSelectedDifficulty(difficulty.id);
      setScreenMode('game');
    },
    [selectedSubject, startRun]
  );


  const startDaily = useCallback(() => {
    dailyActiveRef.current = true;
    quizPoolRef.current = [];
    pendingPoolRef.current = null;
    startRun();
    setSelectedSubject(dailySubject.name);
    setSelectedDifficulty(dailyDifficultyId);
    setScreenMode('game');
  }, [dailySubject, dailyDifficultyId, startRun]);


  /* ========================================================
     LOAD QUESTION POOL
     Teacher-published sets + QuizAPI, then cache, then the
     local quiz bank as a top-up.
  ======================================================== */

  const loadQuestionPool = useCallback(async () => {
    const cacheKey = questionCacheKey(selectedSubject, selectedDifficulty);
    const subjectLabel =
      subjectInfo.shortName || subjectInfo.name || selectedSubject;

    const subjectNames = [
      selectedSubject,
      subjectInfo.name,
      subjectInfo.shortName,
    ]
      .filter(Boolean)
      .map(value => String(value).toLowerCase());

    /* 1. Teacher-published question sets */
    let teacher = [];
    try {
      if (api && typeof api.getQuizBank === 'function') {
        const response = await api.getQuizBank();
        const list = Array.isArray(response?.questions)
          ? response.questions
          : [];

        teacher = list
          .filter(
            question =>
              !question?.subject ||
              subjectNames.includes(String(question.subject).toLowerCase())
          )
          .map(question => ({ ...question, source: 'teacher' }));
      }
    } catch (error) {
      console.log('Teacher question sets unavailable:', error);
    }

    /* 2. QuizAPI */
    let apiQuestions = [];
    try {
      const result = await getQuizBank({
        subject: selectedSubject,
        difficulty: selectedDifficulty,
      });
      apiQuestions = result?.questions || [];

      if (apiQuestions.length > 0) {
        AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ savedAt: Date.now(), questions: apiQuestions })
        ).catch(() => {});
      } else {
        console.log(
          'QuizAPI returned no questions for',
          selectedSubject,
          selectedDifficulty
        );
      }
    } catch (error) {
      console.log('QuizAPI fetch failed, falling back:', error);
    }

    let combined = [...teacher, ...apiQuestions];

    /* 3. Offline cache from a previous session */
    if (combined.length < 8) {
      const cached = await readQuestionCache(cacheKey);
      combined = [...combined, ...cached];
    }

    /* 4. Local quiz bank as a top-up */
    if (combined.length < 8) {
      combined = [
        ...combined,
        ...buildLocalPool(teacher, subjectLabel, selectedDifficulty),
      ];
    }

    return combined;
  }, [
    selectedSubject,
    selectedDifficulty,
    subjectInfo.shortName,
    subjectInfo.name,
  ]);


  /* ========================================================
     CELL UPDATES (row replaced so only that row re-renders)
  ======================================================== */

  const setCell = useCallback((r, c, value) => {
    const g = gridRef.current;
    if (!g || !g[r]) return;
    const row = g[r].slice();
    row[c] = value;
    g[r] = row;
  }, []);


  /* ========================================================
     SETUP GAME (used for start, next level and restart)
  ======================================================== */

  const setupGame = useCallback(() => {
    const diffId = selectedDifficulty || 'easy';
    const daily = dailyActiveRef.current;
    const lvl = levelRef.current;
    const seed = daily ? hashString(`${todayKey()}:${lvl}`) : 0;

    const selectedMap = daily
      ? withSeededRandom(seed, () => getRandomMaze(diffId))
      : getRandomMaze(diffId);

    const preparedMaze = prepareMazeMap(selectedMap);
    const grid = preparedMaze.grid.map(row => [...row]);
    const start = preparedMaze.playerStart || { r: 1, c: 1 };

    /* ---- place power-ups on coin cells away from the start ---- */
    const rng = daily ? mulberry32(seed + 7) : Math.random;
    const candidates = [];

    grid.forEach((row, r) =>
      row.forEach((value, c) => {
        if (
          value === COIN &&
          Math.abs(r - start.r) + Math.abs(c - start.c) >= 4
        ) {
          candidates.push([r, c]);
        }
      })
    );

    const plan = [
      CELL_PELLET,
      CELL_PELLET,
      CELL_FREEZE,
      CELL_SHIELD,
      CELL_FIFTY,
      CELL_FIFTY,
      CELL_SKIP,
    ];
    if (diffId !== 'easy') plan.push(CELL_LIFE);

    const maxPower = Math.floor(candidates.length * 0.15);
    const spots = shuffleArray(candidates, rng);

    plan.slice(0, maxPower).forEach((type, i) => {
      const spot = spots[i];
      if (spot) grid[spot[0]][spot[1]] = type;
    });

    mazeRef.current = preparedMaze;
    gridRef.current = grid;
    cornersRef.current = computeCorners(grid);

    playerRef.current = { ...start };
    ghostsRef.current = buildGhosts(preparedMaze);

    const carry = lvl > 1 ? carryRef.current : { score: 0, coins: 0 };

    livesRef.current = 3;
    livesLostRef.current = 0;
    scoreRef.current = carry.score;
    coinsRef.current = carry.coins;
    levelStartCoinsRef.current = carry.coins;
    runningRef.current = true;
    gameFinishedRef.current = false;
    awaitingQuizRef.current = false;
    currentQuizCellRef.current = null;
    quizAnsweredRef.current = 0;
    correctCountRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    missedRef.current = [];
    missedQueueRef.current = [];
    quizIndexRef.current = 0;

    shieldRef.current = 0;
    fiftyRef.current = 0;
    skipRef.current = 0;
    powerCollectedRef.current = 0;
    ghostsEatenRef.current = 0;
    frightenedUntilRef.current = 0;
    freezeUntilRef.current = 0;
    invulnUntilRef.current = 0;

    clockRef.current = 0;
    playTimeRef.current = 0;
    playerAccRef.current = 0;
    ghostAccRef.current = 0;
    animAccRef.current = 0;
    ghostStepCountRef.current = 0;
    respawnRef.current = 0;
    lastAnimTargetRef.current = null;
    facingDirRef.current = { dr: 0, dc: 1 };
    facingDegRef.current = 0;
    flipRef.current = false;
    resetDirections();

    coinsTotalRef.current = grid
      .flat()
      .filter(value => value === COIN).length;
    coinsRemainingRef.current = coinsTotalRef.current;

    quizTotalRef.current = grid
      .flat()
      .filter(value => value === QUIZ).length;

    setLives(3);
    setScore(carry.score);
    setCoins(carry.coins);
    setPaused(false);
    setQuizVisible(false);
    setQuizQuestion(null);
    setQuizFeedback('');
    setQuizPicked(null);
    setHiddenOpts([]);
    setGameFinished(false);
    setDying(false);
    setShield(false);
    setFiftyCount(0);
    setSkipCount(0);
    setStreak(0);
    setFx([]);
    setLevel(lvl);
    setCountdown(3);

    refresh();
  }, [selectedDifficulty, refresh, resetDirections]);

  setupGameRef.current = setupGame;


  /* ========================================================
     INITIALIZE GAME
  ======================================================== */

  useEffect(() => {
    if (screenMode !== 'game') return;
    if (!selectedDifficulty) return;

    setupGameRef.current();
  }, [screenMode, selectedDifficulty]);


  /* ========================================================
     LOAD QUESTIONS WHEN GAME STARTS
     (cache first so the game is ready instantly, API refreshes)
  ======================================================== */

  useEffect(() => {
    if (screenMode !== 'game') return undefined;
    if (!selectedSubject || !selectedDifficulty) return undefined;

    let alive = true;

    const rng = dailyActiveRef.current
      ? mulberry32(hashString(todayKey()) + 3)
      : Math.random;

    const load = async () => {
      const cached = await readQuestionCache(
        questionCacheKey(selectedSubject, selectedDifficulty)
      );

      if (alive && cached.length > 0 && quizPoolRef.current.length === 0) {
        quizPoolRef.current = preparePool(cached, rng);
        quizIndexRef.current = 0;
      }

      const fresh = await loadQuestionPool();
      if (!alive || !fresh || fresh.length === 0) return;

      const prepared = preparePool(fresh, rng);

      if (
        quizPoolRef.current.length === 0 ||
        quizIndexRef.current === 0
      ) {
        quizPoolRef.current = prepared;
        quizIndexRef.current = 0;
      } else {
        pendingPoolRef.current = prepared;
      }

      console.log(
        'Quiz pool ready:',
        prepared.length,
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

     Missed questions come back after 3 more answers. The pool
     is shuffled once and cycled, so nothing repeats until it is
     exhausted. Answer order is shuffled every time.
  ======================================================== */

  const nextQuestion = useCallback(() => {
    /* 1. A previously missed question that is due again */
    const dueIdx = missedQueueRef.current.findIndex(
      item => item.dueAfter <= quizAnsweredRef.current
    );

    if (dueIdx >= 0) {
      const [item] = missedQueueRef.current.splice(dueIdx, 1);
      return shuffleQuestion(item.question);
    }

    /* 2. Pool empty? Use pending pool, else local quiz bank */
    if (quizPoolRef.current.length === 0) {
      if (pendingPoolRef.current && pendingPoolRef.current.length > 0) {
        quizPoolRef.current = pendingPoolRef.current;
        pendingPoolRef.current = null;
      } else {
        quizPoolRef.current = preparePool(
          buildLocalPool(
            [],
            subjectInfo.shortName || subjectInfo.name || selectedSubject,
            selectedDifficulty
          )
        );

        loadQuestionPool()
          .then(pool => {
            if (pool && pool.length > 0) {
              pendingPoolRef.current = preparePool(pool);
            }
          })
          .catch(() => {});
      }
      quizIndexRef.current = 0;
    }

    /* Still empty — safe fallback. */
    if (quizPoolRef.current.length === 0) {
      return {
        q: 'No questions available for this subject yet. Choose any answer to continue.',
        opts: ['Continue', 'Continue', 'Continue', 'Continue'],
        correct: 0,
      };
    }

    /* 3. Wrap around when we reach the end (reshuffled). */
    if (quizIndexRef.current >= quizPoolRef.current.length) {
      quizIndexRef.current = 0;

      if (pendingPoolRef.current && pendingPoolRef.current.length > 0) {
        quizPoolRef.current = pendingPoolRef.current;
        pendingPoolRef.current = null;
      } else {
        quizPoolRef.current = shuffleArray(quizPoolRef.current);
      }
    }

    const question = quizPoolRef.current[quizIndexRef.current];
    quizIndexRef.current += 1;

    return shuffleQuestion(question);
  }, [
    subjectInfo.shortName,
    subjectInfo.name,
    selectedSubject,
    selectedDifficulty,
    loadQuestionPool,
  ]);


  /* ========================================================
     OPEN QUIZ (synchronous: the pool is always ready)
  ======================================================== */

  const openQuiz = useCallback(
    cell => {
      if (
        awaitingQuizRef.current ||
        quizVisibleRef.current ||
        gameFinishedRef.current
      ) {
        return;
      }

      awaitingQuizRef.current = true;
      resetDirections();

      /* Mark cell visited immediately so it can't re-trigger. */
      setCell(cell.r, cell.c, VISITED);
      currentQuizCellRef.current = cell;

      const question = nextQuestion();

      timeLeftRef.current = QUIZ_TIME_MS;

      setQuizQuestion(question);
      setQuizFeedback('');
      setQuizPicked(null);
      setHiddenOpts([]);
      setQuizSerial(value => value + 1);
      setQuizVisible(true);

      feedback('quiz');
    },
    [nextQuestion, resetDirections, setCell, feedback]
  );


  /* ========================================================
     FINISH GAME  (stars, achievements, high scores, review)
  ======================================================== */

  const finishGame = useCallback(
    async outcome => {
      if (gameFinishedRef.current) return;

      gameFinishedRef.current = true;
      runningRef.current = false;

      setGameFinished(true);

      const win = outcome === 'win';
      const daily = dailyActiveRef.current;
      const finalScore = scoreRef.current;
      const timeMs = playTimeRef.current;
      const parMs = coinsTotalRef.current * playerStepRef.current * 1.8;

      const stars = win
        ? 1 + (livesRef.current >= 2 ? 1 : 0) + (timeMs <= parMs ? 1 : 0)
        : 0;

      const coinsCollected = Math.max(
        0,
        coinsTotalRef.current - coinsRemainingRef.current
      );

      const earnedThisLevel = Math.max(
        0,
        coinsRef.current - levelStartCoinsRef.current
      );

      const answered = quizAnsweredRef.current;
      const correct = correctCountRef.current;
      const key = progressKey(selectedSubject, selectedDifficulty);
      const prev = progressRef.current;

      /* ---- achievements ---- */
      const have = { ...(prev.achievements || {}) };
      const unlocked = [];
      const unlock = id => {
        if (!have[id]) {
          have[id] = Date.now();
          unlocked.push(id);
        }
      };

      if (win) {
        unlock('first_win');
        if (livesLostRef.current === 0) unlock('flawless');
        if (daily) unlock('daily_done');
      }
      if (bestStreakRef.current >= 5) unlock('streak_5');
      if (answered >= 3 && correct === answered) unlock('quiz_ace');
      if (stars === 3) unlock('speed_runner');
      if (powerCollectedRef.current >= 4) unlock('power_user');
      if (ghostsEatenRef.current >= 3) unlock('ghost_hunter');
      if (levelRef.current >= 3) unlock('level_3');

      /* ---- high scores ---- */
      const prevBest = prev.best?.[key] || 0;
      const isNewBest = finalScore > prevBest;
      const topRuns = [
        ...(prev.top?.[key] || []),
        {
          score: finalScore,
          stars,
          level: levelRef.current,
          date: todayKey(),
        },
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      commitProgress(p => ({
        ...p,
        achievements: have,
        wins: (p.wins || 0) + (win ? 1 : 0),
        best: { ...p.best, [key]: Math.max(prevBest, finalScore) },
        stars: {
          ...p.stars,
          [key]: Math.max(p.stars?.[key] || 0, stars),
        },
        top: { ...p.top, [key]: topRuns },
        daily: daily
          ? {
              ...p.daily,
              [todayKey()]: {
                score: finalScore,
                stars,
                won: win,
              },
            }
          : p.daily,
      }));

      feedback(win ? 'win' : 'hit');

      /* `level` is sent only on a win and only if the maze has an id,
         matching the old "completed level" semantics. */
      /*const mazeId = mazeRef.current?.id ?? mazeRef.current?.levelId;*/

      try {
        await recordGame('quiz_maze', {
          score: finalScore,
          coinsEarned: earnedThisLevel,
          subject: selectedSubject,
          difficulty: selectedDifficulty,
          stars,
          // Numeric, and only on a win, so completing level N unlocks N + 1.
          ...(win ? { level: levelRef.current } : {}),
        });
      } 
      catch (error) {
        console.log('Could not record maze game:', error);
      }

      setReview({
        outcome,
        stars,
        score: finalScore,
        coins: coinsRef.current,
        level: levelRef.current,
        timeMs,
        parMs,
        answered,
        correct,
        missed: [...missedRef.current],
        unlocked,
        isNewBest,
        best: Math.max(prevBest, finalScore),
        top: topRuns,
        daily,
      });

      setScreenMode('review');
    },
    [
      recordGame,
      selectedSubject,
      selectedDifficulty,
      commitProgress,
      feedback,
    ]
  );


  /* ========================================================
     CHECK WIN
  ======================================================== */

  const checkWin = useCallback(() => {
    if (gameFinishedRef.current) return;

    if (awaitingQuizRef.current) return;

    if (coinsRemainingRef.current <= 0) {
      finishGame('win');
    }
  }, [finishGame]);

  const checkWinRef = useRef(checkWin);
  checkWinRef.current = checkWin;


  /* ========================================================
     LOSE LIFE (death animation + safe respawn via the loop)
  ======================================================== */

  const loseLife = useCallback(() => {
    if (!runningRef.current || gameFinishedRef.current) return;

    const nextLives = livesRef.current - 1;
    livesRef.current = nextLives;
    livesLostRef.current += 1;
    streakRef.current = 0;
    setStreak(0);
    setLives(nextLives);

    feedback('hit');

    if (nextLives <= 0) {
      finishGame('lose');
      return;
    }

    resetDirections();
    runningRef.current = false;
    setDying(true);
    respawnRef.current = RESPAWN_MS;
    refresh();
  }, [finishGame, refresh, resetDirections, feedback]);


  const doRespawn = useCallback(() => {
    playerRef.current = {
      ...(mazeRef.current?.playerStart || { r: 1, c: 1 }),
    };
    ghostsRef.current = buildGhosts(mazeRef.current);

    resetDirections();
    frightenedUntilRef.current = 0;
    freezeUntilRef.current = 0;
    invulnUntilRef.current = clockRef.current + INVULN_MS;

    runningRef.current = true;
    setDying(false);
    refresh();
  }, [refresh, resetDirections]);


  /* ========================================================
     COLLISIONS (same-cell; moves are applied one at a time and
     checked after each, so passing through is not possible)
  ======================================================== */

  const checkCollisions = useCallback(() => {
    if (!runningRef.current || gameFinishedRef.current) return;

    const p = playerRef.current;
    const clock = clockRef.current;

    for (const ghost of ghostsRef.current) {
      if (ghost.deadUntil && clock < ghost.deadUntil) continue;
      if (ghost.r !== p.r || ghost.c !== p.c) continue;

      /* Power pellet: eat the ghost */
      if (clock < frightenedUntilRef.current) {
        ghost.r = ghost.homeR;
        ghost.c = ghost.homeC;
        ghost.lastDir = null;
        ghost.deadUntil = clock + GHOST_DEAD_MS;
        ghostsEatenRef.current += 1;

        scoreRef.current += 200;
        setScore(scoreRef.current);
        addFx('text', p.r, p.c, { text: '+200', color: '#2F9E44' });
        addFx('burst', p.r, p.c, { color: COLORS.accent });
        feedback('power');
        continue;
      }

      /* Safe time after respawn / shield hit */
      if (clock < invulnUntilRef.current) continue;

      /* Shield absorbs one hit */
      if (shieldRef.current > 0) {
        shieldRef.current = 0;
        setShield(false);
        invulnUntilRef.current = clock + SHIELD_INVULN_MS;
        addFx('text', p.r, p.c, { text: '🛡️ Blocked!', color: COLORS.primary });
        feedback('hit');
        continue;
      }

      loseLife();
      return;
    }
  }, [loseLife, addFx, feedback]);


  /* ========================================================
     MOVE GHOSTS (personalities, scatter/chase, fear, freeze)
  ======================================================== */

  const moveGhosts = useCallback(() => {
    const grid = gridRef.current;

    if (
      !grid ||
      !runningRef.current ||
      awaitingQuizRef.current ||
      gameFinishedRef.current
    ) {
      return false;
    }

    const clock = clockRef.current;

    if (clock < freezeUntilRef.current) return false;

    ghostStepCountRef.current += 1;

    const player = playerRef.current;
    const frightened = clock < frightenedUntilRef.current;
    const phase =
      clock % SCATTER_CYCLE_MS < CHASE_MS ? 'chase' : 'scatter';

    let moved = false;

    ghostsRef.current.forEach((ghost, i) => {
      if (ghost.deadUntil) {
        if (clock < ghost.deadUntil) return;
        ghost.deadUntil = 0;
      }

      /* Scared ghosts are slower */
      if (frightened && ghostStepCountRef.current % 2 === 1) return;

      const options = [];
      for (const [dr, dc] of DIR_LIST) {
        const n = stepCell(grid, ghost.r, ghost.c, dr, dc);
        if (n) options.push({ dr, dc, r: n.r, c: n.c });
      }
      if (options.length === 0) return;

      const forward = ghost.lastDir
        ? options.filter(
            o =>
              !(o.dr === -ghost.lastDir[0] && o.dc === -ghost.lastDir[1])
          )
        : options;
      const pool = forward.length > 0 ? forward : options;
      const randomPick = () => pool[Math.floor(Math.random() * pool.length)];

      let choice = null;

      if (frightened) {
        /* Flee: maximise distance from the player */
        let bestDist = -1;
        pool.forEach(o => {
          const d = manhattan(o, player) + Math.random() * 0.5;
          if (d > bestDist) {
            bestDist = d;
            choice = o;
          }
        });
      } else if (ghost.type === 'wanderer' || Math.random() < 0.1) {
        choice = randomPick();
      } else {
        let target = player;

        if (phase === 'scatter') {
          target = cornersRef.current[i % 4] || player;
        } else if (ghost.type === 'ambusher') {
          const f = facingDirRef.current;
          for (let k = 4; k >= 1; k -= 1) {
            const tr = player.r + f.dr * k;
            const tc = player.c + f.dc * k;
            if (
              tr >= 0 &&
              tr < grid.length &&
              tc >= 0 &&
              tc < grid[0].length &&
              grid[tr][tc] !== WALL
            ) {
              target = { r: tr, c: tc };
              break;
            }
          }
        } else if (ghost.type === 'patrol') {
          /* Patrols its corner, but pounces when the player is close */
          target =
            manhattan(ghost, player) <= 5
              ? player
              : cornersRef.current[i % 4] || player;
        }

        const step = bfsFirstStep(grid, ghost, target);
        if (step) {
          choice =
            options.find(o => o.dr === step[0] && o.dc === step[1]) ||
            randomPick();
        } else {
          choice = randomPick();
        }
      }

      if (!choice) return;

      ghost.lastDir = [choice.dr, choice.dc];
      ghost.r = choice.r;
      ghost.c = choice.c;
      moved = true;
    });

    return moved;
  }, []);


  /* ========================================================
     POWER-UP PICKUPS
  ======================================================== */

  const collectPower = useCallback(
    (cell, pos) => {
      const clock = clockRef.current;
      let text = '';
      let bonus = 20;

      switch (cell) {
        case CELL_PELLET:
          frightenedUntilRef.current = clock + FRIGHT_MS;
          text = '⚡ Power!';
          bonus = 50;
          break;
        case CELL_FREEZE:
          freezeUntilRef.current = clock + FREEZE_MS;
          text = '❄️ Freeze!';
          break;
        case CELL_SHIELD:
          shieldRef.current = 1;
          setShield(true);
          text = '🛡️ Shield';
          break;
        case CELL_LIFE:
          if (livesRef.current < MAX_LIVES) {
            livesRef.current += 1;
            setLives(livesRef.current);
          }
          text = '❤️ +1 life';
          break;
        case CELL_FIFTY:
          fiftyRef.current += 1;
          setFiftyCount(fiftyRef.current);
          text = '½ 50/50';
          break;
        case CELL_SKIP:
          skipRef.current += 1;
          setSkipCount(skipRef.current);
          text = '⏭️ Skip';
          break;
        default:
          break;
      }

      setCell(pos.r, pos.c, VISITED);
      powerCollectedRef.current += 1;
      scoreRef.current += bonus;
      setScore(scoreRef.current);

      addFx('text', pos.r, pos.c, { text, color: COLORS.primary });
      addFx('burst', pos.r, pos.c, { color: COLORS.primary });
      feedback('power');
    },
    [setCell, addFx, feedback]
  );


  /* ========================================================
     MOVE PLAYER (one cell)
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
      const next = stepCell(gridRef.current, player.r, player.c, dr, dc);

      if (!next) return;

      playerRef.current = next;
      facingDirRef.current = { dr, dc };
      facingDegRef.current = dirToDeg(dr, dc);

      const cell = gridRef.current[next.r][next.c];

      if (cell === COIN) {
        setCell(next.r, next.c, VISITED);

        coinsRemainingRef.current = Math.max(
          0,
          coinsRemainingRef.current - 1
        );

        coinsRef.current += difficultyInfo.coinValue || 1;
        scoreRef.current += 10;

        setCoins(coinsRef.current);
        setScore(scoreRef.current);

        addFx('text', next.r, next.c, { text: '+10', color: COLORS.accent });
        feedback('coin');
      } else if (cell === QUIZ) {
        openQuiz({ r: next.r, c: next.c });
      } else if (POWER_CELLS.includes(cell)) {
        collectPower(cell, next);
      }

      checkCollisions();
      refresh();

      setTimeout(() => checkWinRef.current(), 30);
    },
    [
      screenMode,
      paused,
      quizVisible,
      difficultyInfo.coinValue,
      openQuiz,
      collectPower,
      checkCollisions,
      refresh,
      setCell,
      addFx,
      feedback,
    ]
  );

  /* Always point at the latest tryMove so the loop never goes stale. */
  tryMoveRef.current = tryMove;


  /* ========================================================
     DIRECTION BUFFER + PLAYER STEP  (Pac-Man style)
  ======================================================== */

  const canMove = useCallback((dr, dc) => {
    const g = gridRef.current;
    if (!g) return false;
    return !!stepCell(g, playerRef.current.r, playerRef.current.c, dr, dc);
  }, []);


  const setDesiredDir = useCallback(
    (dr, dc) => {
      const prev = desiredDirRef.current;
      if (prev.dr === dr && prev.dc === dc) return;

      desiredDirRef.current = { dr, dc };
      feedback('turn');
      refresh();
    },
    [refresh, feedback]
  );


  /* Returns true if the player actually moved. */
  const stepPlayer = useCallback(() => {
    if (
      !runningRef.current ||
      awaitingQuizRef.current ||
      gameFinishedRef.current
    ) {
      return false;
    }

    const want = desiredDirRef.current;

    /* 1. Take the buffered turn as soon as it becomes legal. */
    if ((want.dr || want.dc) && canMove(want.dr, want.dc)) {
      currentDirRef.current = want;
    }

    /* 2. Keep going straight; stop at walls (buffered turn stays queued). */
    const dir = currentDirRef.current;

    if (dir.dr || dir.dc) {
      if (canMove(dir.dr, dir.dc)) {
        tryMoveRef.current?.(dir.dr, dir.dc);
        return true;
      }
      currentDirRef.current = STOP;
    }

    return false;
  }, [canMove]);


  /* ========================================================
     SINGLE GAME LOOP (player + ghosts + timers share one clock)
  ======================================================== */

  const levelFactor = Math.max(0.5, 1 - 0.07 * (level - 1));

  playerStepRef.current =
    difficultyInfo.playerSpeed ||
    PLAYER_STEP_BY_DIFFICULTY[selectedDifficulty] ||
    170;

  ghostStepRef.current = Math.round(
    (difficultyInfo.ghostSpeed || 650) * levelFactor
  );

  tickRef.current = dt => {
    if (gameFinishedRef.current) return;

    /* Waiting to respawn after a death */
    if (respawnRef.current > 0) {
      respawnRef.current -= dt;
      if (respawnRef.current <= 0) doRespawn();
      return;
    }

    if (!runningRef.current) return;

    clockRef.current += dt;
    playTimeRef.current += dt;

    let dirty = false;

    playerAccRef.current += dt;
    while (playerAccRef.current >= playerStepRef.current) {
      playerAccRef.current -= playerStepRef.current;
      if (stepPlayer()) dirty = true;
      if (!runningRef.current) break;
    }

    ghostAccRef.current += dt;
    while (ghostAccRef.current >= ghostStepRef.current) {
      ghostAccRef.current -= ghostStepRef.current;
      if (moveGhosts()) {
        dirty = true;
        checkCollisions();
      }
      if (!runningRef.current) break;
    }

    /* Keep blinking / fear visuals alive */
    animAccRef.current += dt;
    if (animAccRef.current >= 150) {
      animAccRef.current = 0;
      dirty = true;
    }

    if (dirty) refresh();
  };

  const loopActive =
    screenMode === 'game' &&
    !paused &&
    !quizVisible &&
    !gameFinished &&
    countdown === 0;

  useEffect(() => {
    if (!loopActive) return undefined;

    let last = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(100, now - last);
      last = now;
      tickRef.current?.(dt);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [loopActive]);


  /* 3-2-1 countdown (start of game and after resume) */
  useEffect(() => {
    if (
      screenMode !== 'game' ||
      countdown <= 0 ||
      paused ||
      settingsVisible
    ) {
      return undefined;
    }

    const id = setTimeout(() => {
      setCountdown(value => Math.max(0, value - 1));
    }, 800);

    return () => clearTimeout(id);
  }, [screenMode, countdown, paused, settingsVisible]);


  /* Don't lurch off after pause / quiz */
  useEffect(() => {
    if (paused || quizVisible) resetDirections();
  }, [paused, quizVisible, resetDirections]);


  /* Smooth cell-to-cell sliding (runs after every render, cheap) */
  useEffect(() => {
    const cw = cellWRef.current;
    const ch = cellHRef.current;
    if (!cw || !ch) return;

    const tx = playerRef.current.c * cw;
    const ty = playerRef.current.r * ch;
    const last = lastAnimTargetRef.current;

    if (last && last.x === tx && last.y === ty) return;

    lastAnimTargetRef.current = { x: tx, y: ty };

    const far =
      !last ||
      Math.abs(tx - last.x) > cw * 1.5 ||
      Math.abs(ty - last.y) > ch * 1.5;

    if (far) {
      /* First placement, respawn, restart or tunnel: snap. */
      playerAnim.stopAnimation();
      playerAnim.setValue({ x: tx, y: ty });
    } else {
      Animated.timing(playerAnim, {
        toValue: { x: tx, y: ty },
        duration: playerStepRef.current * 0.9,
        useNativeDriver: true,
      }).start();
    }
  });


  /* ========================================================
     PAUSE HELPERS
  ======================================================== */

  const resumeGame = useCallback(() => {
    setPaused(false);
    setCountdown(3);
  }, []);

  const togglePause = useCallback(() => {
    if (pausedRef.current) {
      resumeGame();
    } else {
      setPaused(true);
    }
  }, [resumeGame]);


  /* ========================================================
     GESTURE CONTROLS
     Swipe: set direction, re-anchor, release does not move.
     Joystick: touch-down point is the centre, angle = direction.
     D-pad only: gestures are ignored.
     Handlers are attached to the whole screen.
  ======================================================== */

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        /* Taps pass through to buttons (D-pad, pause, back). */
        onStartShouldSetPanResponder: () => false,

        /* Any real drag, anywhere on the screen, is captured here. */
        onMoveShouldSetPanResponderCapture: (_, g) =>
          controlModeRef.current !== 'dpad' &&
          (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8),
        onMoveShouldSetPanResponder: (_, g) =>
          controlModeRef.current !== 'dpad' &&
          (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8),

        /* Don't let anything steal the gesture once it's ours. */
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (_, g) => {
          /* Use the real touch-start point so the first move isn't lost. */
          originRef.current = { x: g.x0, y: g.y0 };

          if (controlModeRef.current === 'joystick') {
            joyBase.setValue({ x: g.x0 - 50, y: g.y0 - 50 });
            joyKnob.setValue({ x: 0, y: 0 });
            joyOpacity.setValue(1);
          }
        },

        onPanResponderMove: (_, g) => {
          if (
            pausedRef.current ||
            quizVisibleRef.current ||
            awaitingQuizRef.current ||
            gameFinishedRef.current
          ) {
            return;
          }

          const pageX = g.moveX;
          const pageY = g.moveY;
          const dx = pageX - originRef.current.x;
          const dy = pageY - originRef.current.y;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          /* ---------- JOYSTICK ---------- */
          if (controlModeRef.current === 'joystick') {
            const len = Math.hypot(dx, dy) || 1;
            const k = Math.min(1, JOYSTICK_RADIUS / len);
            joyKnob.setValue({ x: dx * k, y: dy * k });

            if (len < JOYSTICK_DEADZONE) return;

            const cur = desiredDirRef.current;
            let horizontal;

            if (!cur.dr && !cur.dc) {
              horizontal = absX >= absY;
            } else if (cur.dc !== 0) {
              horizontal = !(absY > absX * AXIS_BIAS);
            } else {
              horizontal = absX > absY * AXIS_BIAS;
            }

            if (horizontal) {
              setDesiredDir(0, dx > 0 ? 1 : -1);
            } else {
              setDesiredDir(dy > 0 ? 1 : -1, 0);
            }
            return;
          }

          /* ---------- SWIPE ---------- */
          if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;

          if (absX > absY * AXIS_BIAS) {
            setDesiredDir(0, dx > 0 ? 1 : -1);
          } else if (absY > absX * AXIS_BIAS) {
            setDesiredDir(dy > 0 ? 1 : -1, 0);
          } else {
            return; // ambiguous diagonal: wait for more movement
          }

          /* Re-anchor so the next turn needs only a short drag. */
          originRef.current = { x: pageX, y: pageY };
        },

        onPanResponderRelease: () => {
          joyOpacity.setValue(0);
        },

        onPanResponderTerminate: () => {
          joyOpacity.setValue(0);
        },
      }),
    [setDesiredDir, joyBase, joyKnob, joyOpacity]
  );


  /* ========================================================
     KEYBOARD (web only)
  ======================================================== */

  useEffect(() => {
    if (
      screenMode !== 'game' ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    ) {
      return undefined;
    }

    const handleKeyDown = event => {
      switch (String(event.key).toLowerCase()) {
        case 'arrowup':
        case 'w':
          event.preventDefault();
          setDesiredDir(-1, 0);
          break;
        case 'arrowdown':
        case 's':
          event.preventDefault();
          setDesiredDir(1, 0);
          break;
        case 'arrowleft':
        case 'a':
          event.preventDefault();
          setDesiredDir(0, -1);
          break;
        case 'arrowright':
        case 'd':
          event.preventDefault();
          setDesiredDir(0, 1);
          break;
        case 'p':
        case 'escape':
          if (!quizVisible && !gameFinished) togglePause();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screenMode, setDesiredDir, quizVisible, gameFinished, togglePause]);


  /* ========================================================
     APP STATE
  ======================================================== */

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      nextState => {
        if (
          nextState !== 'active' &&
          screenMode === 'game' &&
          runningRef.current &&
          !quizVisible &&
          !gameFinished
        ) {
          setPaused(true);
        }
      }
    );

    return () => subscription.remove();
  }, [screenMode, quizVisible, gameFinished]);


  /* ========================================================
     QUIZ: ANSWER, CLOSE, POWER TOKENS
  ======================================================== */

  const closeQuiz = useCallback(() => {
    currentQuizCellRef.current = null;
    awaitingQuizRef.current = false;

    setQuizVisible(false);
    setQuizQuestion(null);
    setQuizFeedback('');
    setQuizPicked(null);
    setHiddenOpts([]);

    refresh();

    setTimeout(() => checkWinRef.current(), 50);
  }, [refresh]);


  const answerQuiz = useCallback(
    index => {
      if (!quizQuestion || quizFeedback) return;

      setQuizPicked(index);

      const timed = settingsRef.current.timerEnabled;
      const frac = timed ? timeLeftRef.current / QUIZ_TIME_MS : 0;
      const correct = index === quizQuestion.correct;
      const correctText = quizQuestion.opts[quizQuestion.correct];
      const explanation = getExplanation(quizQuestion);
      const reward = difficultyInfo.coinReward || 2;

      quizAnsweredRef.current += 1;

      let message;

      if (correct) {
        const mult = 1 + 0.25 * Math.min(streakRef.current, 4);
        const speedBonus = Math.round(15 * frac);
        const points = Math.round((25 + speedBonus) * mult);

        coinsRef.current += reward;
        scoreRef.current += points;
        streakRef.current += 1;
        correctCountRef.current += 1;
        bestStreakRef.current = Math.max(
          bestStreakRef.current,
          streakRef.current
        );

        setCoins(coinsRef.current);
        setScore(scoreRef.current);
        setStreak(streakRef.current);

        message = `✓ Correct! +${reward} coins • +${points} pts`;
        if (mult > 1) message += `\n🔥 Streak bonus x${mult}`;
        if (speedBonus > 0) message += `\n⚡ Speed bonus +${speedBonus}`;

        feedback('correct');

        const cell = currentQuizCellRef.current;
        if (cell) {
          addFx('burst', cell.r, cell.c, { color: '#2F9E44' });
          addFx('text', cell.r, cell.c, {
            text: `+${points}`,
            color: '#2F9E44',
          });
        }
      } else {
        /* Wrong answers cost a third of the reward, but you can never
           drop below the coins you carried into this level. */
        const penalty = Math.max(1, Math.round(reward / 3));
        const before = coinsRef.current;
        coinsRef.current = Math.max(
          levelStartCoinsRef.current,
          before - penalty
        );
        const lost = before - coinsRef.current;

        scoreRef.current = Math.max(0, scoreRef.current - 5);
        streakRef.current = 0;

        setCoins(coinsRef.current);
        setScore(scoreRef.current);
        setStreak(0);

        message =
          index === -1
            ? `⏱ Time's up! Correct answer: ${correctText}`
            : `✗ Incorrect. Correct answer: ${correctText}`;
        if (lost > 0) message += `\n🪙 −${lost} coins`;

        missedRef.current.push({
          q: quizQuestion.q,
          correctText,
          chosenText: index >= 0 ? quizQuestion.opts[index] : null,
          explanation,
        });

        const alreadyQueued = missedQueueRef.current.some(
          item => item.question.q === quizQuestion.q
        );
        if (!alreadyQueued) {
          missedQueueRef.current.push({
            question: quizQuestion,
            dueAfter: quizAnsweredRef.current + 3,
          });
        }

        feedback('wrong');

        const cell = currentQuizCellRef.current;
        if (cell) {
          addFx('burst', cell.r, cell.c, { color: '#E85D5D' });
        }
      }

      if (explanation) {
        message += `\n\n💡 ${explanation}`;
        setQuizFeedback(message); // player taps Continue
      } else {
        setQuizFeedback(message);
        setTimeout(closeQuiz, 1200);
      }
    },
    [
      quizQuestion,
      quizFeedback,
      difficultyInfo.coinReward,
      closeQuiz,
      addFx,
      feedback,
    ]
  );

  answerQuizRef.current = answerQuiz;

  const onQuizExpire = useCallback(() => {
    answerQuizRef.current?.(-1);
  }, []);


  const applyFifty = useCallback(() => {
    if (
      fiftyRef.current <= 0 ||
      quizFeedback ||
      hiddenOpts.length > 0 ||
      !quizQuestion ||
      quizQuestion.opts.length < 3
    ) {
      return;
    }

    const wrong = quizQuestion.opts
      .map((_, i) => i)
      .filter(i => i !== quizQuestion.correct);

    fiftyRef.current -= 1;
    setFiftyCount(fiftyRef.current);
    setHiddenOpts(shuffleArray(wrong).slice(0, 2));
    feedback('power');
  }, [quizFeedback, hiddenOpts, quizQuestion, feedback]);


  const applySkip = useCallback(() => {
    if (skipRef.current <= 0 || quizFeedback) return;

    skipRef.current -= 1;
    setSkipCount(skipRef.current);
    feedback('power');
    closeQuiz();
  }, [quizFeedback, closeQuiz, feedback]);


  /* ========================================================
     RESTART / NEXT LEVEL / PLAY AGAIN / BACK
  ======================================================== */

  const restartGame = useCallback(() => {
    setupGameRef.current();
  }, []);


  const startNextLevel = useCallback(() => {
    carryRef.current = {
      score: scoreRef.current,
      coins: coinsRef.current,
    };
    levelRef.current += 1;
    setReview(null);
    setScreenMode('game');
  }, []);


  const playAgain = useCallback(() => {
    startRun();
    setReview(null);
    setScreenMode('game');
  }, [startRun]);


  const continueToResults = useCallback(() => {
  if (!review) return;

    navigation.replace('MazeResult', {
      outcome: review.outcome,
      score: review.score,
      coins: review.coins,
      subject: selectedSubject,
      difficulty: selectedDifficulty,
      stars: review.stars,
      level: review.level,
      missedCount: review.missed.length,
      daily: review.daily,
    });
  }, [review, navigation, selectedSubject, selectedDifficulty]);


  const backToDashboard = useCallback(() => {
    runningRef.current = false;
    dailyActiveRef.current = false;
    resetDirections();

    setPaused(false);
    setCountdown(0);
    setQuizVisible(false);
    setQuizQuestion(null);
    setQuizFeedback('');
    setReview(null);

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
    pendingPoolRef.current = null;
    quizIndexRef.current = 0;
    awaitingQuizRef.current = false;
    gameFinishedRef.current = false;
    lastAnimTargetRef.current = null;
  }, [incomingSubject, navigation, resetDirections]);


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
     SETTINGS MODAL (shared by every screen)
  ======================================================== */

  const settingsModal = (
    <SettingsModal
      visible={settingsVisible}
      settings={settings}
      onChange={updateSettings}
      onClose={() => setSettingsVisible(false)}
    />
  );


  /* ========================================================
     DASHBOARD SCREEN
  ======================================================== */

  if (screenMode === 'dashboard') {
    const unlockedCount = ACHIEVEMENTS.filter(
      item => progress.achievements?.[item.id]
    ).length;

    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: topPad }]}
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

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSettingsVisible(true)}
            >
              <Ionicons
                name="settings-outline"
                size={19}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
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

          {/* Daily challenge */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.dailyCard}
            onPress={startDaily}
          >
            <View style={styles.dailyIconBox}>
              <Text style={styles.dailyIcon}>
                {dailySubject.icon || DEFAULT_SUBJECT_ICON}
              </Text>
            </View>

            <View style={styles.dailyInfo}>
              <Text style={styles.dailyLabel}>📅 DAILY CHALLENGE</Text>
              <Text style={styles.dailyName}>{dailySubject.name}</Text>
              <Text style={styles.dailyMeta}>
                {dailyDone
                  ? `Done today • ${starsText(dailyDone.stars)} • ${dailyDone.score} pts`
                  : 'Same maze for everyone today. One run to beat.'}
              </Text>
            </View>

            <Ionicons
              name={dailyDone?.won ? 'checkmark-circle' : 'play-circle'}
              size={28}
              color={dailyDone?.won ? COLORS.success : COLORS.primary}
            />
          </TouchableOpacity>

          {/* Built-in subjects */}
          

          <View style={styles.searchSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Find a Subject</Text>
                <Text style={styles.sectionSubtitle}>
                  Search for any subject or hobby.
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
              <View style={styles.searchInputWrap}>
                <TextInput
                  value={subjectSearch}
                  onChangeText={value => {
                    setSubjectSearch(value);
                    setSearchResult(null);
                    setSearchError('');
                  }}
                  onFocus={() => setSearchFocused(true)}
                  // Short delay so a tap on a suggestion registers before the list hides.
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  placeholder="Mathematics, Python, Cybersecurity..."
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.searchInput}
                  onSubmitEditing={() => searchSubject()}
                  returnKeyType="search"
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                {subjectSearch.length > 0 ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSubjectSearch('');
                      setSearchResult(null);
                      setSearchError('');
                      setSearchFocused(true);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => searchSubject()}
                disabled={searchingSubject}
              >
                {searchingSubject ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="search" size={19} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>

            {suggestions.length > 0 ? (
              <View style={styles.suggestionBox}>
                {!subjectSearch.trim() ? (
                  <Text style={styles.suggestionHeader}>RECENT SEARCHES</Text>
                ) : null}

                {suggestions.map(item => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.suggestionRow}
                    onPress={() => pickSuggestion(item)}
                  >
                    <Text style={styles.suggestionIcon}>
                      {item.icon || SUGGESTION_ICONS[item.type]}
                    </Text>

                    <View style={styles.suggestionLabelWrap}>
                      <HighlightedLabel label={item.label} query={subjectSearch} />
                    </View>

                    <Text style={styles.suggestionTag}>
                      {SUGGESTION_TAGS[item.type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

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

          {/* Achievements */}
          <View style={styles.progressCard}>
            <View style={styles.favoriteHeaderRow}>
              <View style={styles.favoriteHeaderInfo}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                <Text style={styles.sectionSubtitle}>
                  {unlockedCount} of {ACHIEVEMENTS.length} unlocked •{' '}
                  {progress.wins || 0} wins
                </Text>
              </View>
            </View>

            {ACHIEVEMENTS.map(item => {
              const done = !!progress.achievements?.[item.id];
              return (
                <View
                  key={item.id}
                  style={[
                    styles.achievementRow,
                    !done && styles.achievementLocked,
                  ]}
                >
                  <Text style={styles.achievementIcon}>
                    {done ? item.icon : '🔒'}
                  </Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    <Text style={styles.achievementDesc}>{item.desc}</Text>
                  </View>
                  {done ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={COLORS.success}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {settingsModal}
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
          contentContainerStyle={[styles.content, { paddingTop: topPad }]}
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

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSettingsVisible(true)}
            >
              <Ionicons
                name="settings-outline"
                size={19}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
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

              const pk = progressKey(selectedSubject, difficulty.id);
              const bestScore = progress.best?.[pk];
              const bestStars = progress.stars?.[pk] || 0;

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

                    {bestScore ? (
                      <Text style={styles.difficultyBest}>
                        Best: {starsText(bestStars)} • {bestScore} pts
                      </Text>
                    ) : null}
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

        {settingsModal}
      </View>
    );
  }


  /* ========================================================
     REVIEW SCREEN (after every run)
  ======================================================== */

  if (screenMode === 'review' && review) {
    const won = review.outcome === 'win';
    const seconds = Math.round(review.timeMs / 1000);
    const parSeconds = Math.round(review.parMs / 1000);

    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        >
          <View style={styles.reviewHero}>
            <Text style={styles.reviewEmoji}>{won ? '🎉' : '💀'}</Text>
            <Text style={styles.reviewTitle}>
              {won ? 'Maze Cleared!' : 'Game Over'}
            </Text>
            <Text style={styles.reviewSub}>
              {subjectInfo.name || selectedSubject} • {difficultyInfo.name} •
              Level {review.level}
              {review.daily ? ' • Daily' : ''}
            </Text>

            {won ? (
              <Text style={styles.reviewStars}>{starsText(review.stars)}</Text>
            ) : null}

            {review.isNewBest ? (
              <View style={styles.newBestBadge}>
                <Text style={styles.newBestText}>🏅 NEW BEST SCORE</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.reviewStatsRow}>
            <View style={styles.reviewStat}>
              <Text style={styles.reviewStatValue}>{review.score}</Text>
              <Text style={styles.reviewStatLabel}>SCORE</Text>
            </View>
            <View style={styles.reviewStat}>
              <Text style={styles.reviewStatValue}>🪙 {review.coins}</Text>
              <Text style={styles.reviewStatLabel}>COINS</Text>
            </View>
            <View style={styles.reviewStat}>
              <Text style={styles.reviewStatValue}>
                {review.correct}/{review.answered}
              </Text>
              <Text style={styles.reviewStatLabel}>CORRECT</Text>
            </View>
            <View style={styles.reviewStat}>
              <Text style={styles.reviewStatValue}>{seconds}s</Text>
              <Text style={styles.reviewStatLabel}>
                {won ? `PAR ${parSeconds}s` : 'TIME'}
              </Text>
            </View>
          </View>

          {review.unlocked.length > 0 ? (
            <View style={styles.reviewCard}>
              <Text style={styles.sectionTitle}>Achievements unlocked</Text>
              {review.unlocked.map(id => {
                const item = ACHIEVEMENTS.find(a => a.id === id);
                if (!item) return null;
                return (
                  <View key={id} style={styles.achievementRow}>
                    <Text style={styles.achievementIcon}>{item.icon}</Text>
                    <View style={styles.achievementInfo}>
                      <Text style={styles.achievementTitle}>{item.title}</Text>
                      <Text style={styles.achievementDesc}>{item.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={styles.reviewCard}>
            <Text style={styles.sectionTitle}>
              {review.missed.length === 0
                ? 'No missed questions'
                : `Questions to review (${review.missed.length})`}
            </Text>

            {review.missed.length === 0 ? (
              <Text style={styles.reviewNote}>
                {review.answered === 0
                  ? 'You did not answer any questions this run.'
                  : 'Perfect recall. Every answer was correct.'}
              </Text>
            ) : (
              review.missed.map((item, index) => (
                <View key={index} style={styles.missedCard}>
                  <Text style={styles.missedQuestion}>{item.q}</Text>

                  <Text style={styles.missedWrong}>
                    Your answer:{' '}
                    {item.chosenText ? item.chosenText : 'No answer (time up)'}
                  </Text>
                  <Text style={styles.missedRight}>
                    Correct: {item.correctText}
                  </Text>

                  {item.explanation ? (
                    <Text style={styles.missedExplain}>
                      💡 {item.explanation}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {review.top.length > 0 ? (
            <View style={styles.reviewCard}>
              <Text style={styles.sectionTitle}>Your top runs</Text>
              <Text style={styles.sectionSubtitle}>
                Saved on this device for this subject and difficulty.
              </Text>
              {review.top.map((run, index) => (
                <View key={index} style={styles.topRunRow}>
                  <Text style={styles.topRunRank}>#{index + 1}</Text>
                  <Text style={styles.topRunScore}>{run.score} pts</Text>
                  <Text style={styles.topRunMeta}>
                    {starsText(run.stars)} • L{run.level} • {run.date}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.reviewButtons}>
            {won && !review.daily ? (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={startNextLevel}
              >
                <Text style={styles.resumeText}>
                  ▶ NEXT LEVEL ({review.level + 1})
                </Text>
              </TouchableOpacity>
            ) : null}

            {!review.daily ? (
              <TouchableOpacity
                style={styles.restartButton}
                onPress={playAgain}
              >
                <Text style={styles.restartText}>↻ PLAY AGAIN</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.restartButton}
              onPress={continueToResults}
            >
              <Text style={styles.restartText}>VIEW RESULTS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exitButton}
              onPress={backToDashboard}
            >
              <Text style={styles.exitText}>EXIT TO SUBJECTS</Text>
            </TouchableOpacity>
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

  const showDpad = settings.controlMode === 'dpad' || settings.showDpad;
  const showGoals = settings.showGoals;

  /* The maze fills the screen width, then shrinks only if the rest of the layout would not fit the screen height. */
  const reservedHeight =
    56 +                       // header
    68 +                       // HUD
    38 +                       // power row
    28 +                       // maze margins + padding
    (showGoals ? 104 : 0) +    // goals card
    (showDpad ? 190 : 28) +    // D-pad or hint text
    topPad +
    insets.bottom +
    12;

  const availableWidth = width - 40 - 16;
  const availableHeight = Math.max(120, height - reservedHeight);

  const baseW = Math.floor(availableWidth / COLS);
  const baseH = Math.floor(availableHeight / ROWS);

  const cellW = Math.max(
    10,
    Math.min(baseW, Math.floor(baseH / CELL_RATIO))
  );
  const cellH = Math.round(cellW * CELL_RATIO);

  const mazeWidth = COLS * cellW;
  const mazeHeight = ROWS * cellH;
  const ghosts = ghostsRef.current;
  const clock = clockRef.current;

  /* Used by the sliding animation effect. */
  cellWRef.current = cellW;
  cellHRef.current = cellH;

  /* Visual state derived from the game clock */
  const isFrightened = clock < frightenedUntilRef.current;
  const isFrozen = clock < freezeUntilRef.current;
  const isInvulnerable = clock < invulnUntilRef.current;
  const blink = isInvulnerable && Math.floor(clock / 150) % 2 === 0;

  const desired = desiredDirRef.current;
  const facing =
    !currentDirRef.current.dr &&
    !currentDirRef.current.dc &&
    (desired.dr || desired.dc)
      ? dirToDeg(desired.dr, desired.dc)
      : facingDegRef.current;

  /* The artwork only mirrors left/right; up/down keep the last side. */
  if (facing === 180) flipRef.current = true;
  else if (facing === 0) flipRef.current = false;
  const flip = PLAYER_IMAGE_FACES_RIGHT ? flipRef.current : !flipRef.current;

  const questionsAnswered = quizAnsweredRef.current;
  const questionsTotal = quizTotalRef.current;
  const dotsTotal = coinsTotalRef.current;
  const dotsCollected = Math.max(0, dotsTotal - coinsRemainingRef.current);
  const livesLost = livesLostRef.current;

  const streakMult = 1 + 0.25 * Math.min(streak, 4);

  const btnW = settings.largeButtons ? 78 : 60;
  const btnH = settings.largeButtons ? 70 : 54;
  const dpadAlign =
    settings.dpadPosition === 'left'
      ? 'flex-start'
      : settings.dpadPosition === 'right'
      ? 'flex-end'
      : 'center';

  const renderDpadButton = (symbol, dir) => (
    <TouchableOpacity
      style={[styles.controlButton, { width: btnW, height: btnH }]}
      onPressIn={() => setDesiredDir(...dir)}
      disabled={paused || quizVisible}
    >
      <Text style={styles.controlText}>{symbol}</Text>
    </TouchableOpacity>
  );

  const hintText =
    settings.controlMode === 'joystick'
      ? 'Drag anywhere on the screen like a joystick'
      : settings.controlMode === 'dpad'
      ? 'Use the D-pad to steer'
      : 'Swipe anywhere on the screen to steer';

  const questionTag =
    quizQuestion?.source === 'teacher'
      ? '👩‍🏫 Teacher set'
      : quizQuestion?.subject || subjectInfo.name;


  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ScrollView
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: insets.bottom + 12 },
        ]}
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
            <Text style={styles.gameTitle}>
              {subjectInfo.icon || DEFAULT_SUBJECT_ICON}{' '}
              {subjectInfo.name || selectedSubject}
            </Text>
            <Text style={styles.gameSubtitle}>
              {difficultyInfo.icon} {difficultyInfo.name}
              {' • Level '}
              {level}
              {dailyActiveRef.current ? ' • Daily' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.hud}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>LIVES</Text>
            <View style={styles.heartsRow}>
              {Array.from({ length: Math.max(3, lives) }).map((_, i) => (
                <Text
                  key={i}
                  style={[styles.heart, i >= lives && styles.heartDead]}
                >
                  ❤️
                </Text>
              ))}
            </View>
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
            <Text style={styles.hudLabel}>POINTS</Text>
            <Text style={styles.hudValue}>
              ⭐ {dotsCollected}/{dotsTotal}
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

        {/* Power-up status */}
        <View style={styles.powerRow}>
          <View style={styles.powerChip}>
            <Text style={styles.powerChipText}>
              🛡️ {shield ? 'Shield on' : 'No shield'}
            </Text>
          </View>
          <View style={styles.powerChip}>
            <Text style={styles.powerChipText}>½ ×{fiftyCount}</Text>
          </View>
          <View style={styles.powerChip}>
            <Text style={styles.powerChipText}>⏭️ ×{skipCount}</Text>
          </View>
          <View style={styles.powerChip}>
            <Text style={styles.powerChipText}>
              🔥 {streak}
              {streakMult > 1 ? ` (x${streakMult})` : ''}
            </Text>
          </View>
          {isFrightened ? (
            <View style={[styles.powerChip, styles.powerChipOn]}>
              <Text style={styles.powerChipText}>⚡ Hunt!</Text>
            </View>
          ) : null}
          {isFrozen ? (
            <View style={[styles.powerChip, styles.powerChipOn]}>
              <Text style={styles.powerChipText}>❄️ Frozen</Text>
            </View>
          ) : null}
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
            {grid.map((row, r) => (
              <MazeRow
                key={r}
                row={row}
                r={r}
                cellW={cellW}
                cellH={cellH}
              />
            ))}

            {ghosts.map((ghost, index) => {
              const dead = !!ghost.deadUntil && clock < ghost.deadUntil;
              const mode = isFrozen
                ? 'frozen'
                : isFrightened
                ? 'scared'
                : 'normal';

              return (
                <GhostSprite
                  key={`ghost-${index}`}
                  r={ghost.r}
                  c={ghost.c}
                  w={cellW}
                  h={cellH}
                  duration={Math.round(ghostStepRef.current * 0.9)}
                  mode={mode}
                  dead={dead}
                />
              );
            })}

            <PlayerSprite
              anim={playerAnim}
              w={cellW}
              h={cellH}
              flip={flip}
              blink={blink}
              shield={shield}
              dying={dying}
            />

            {fx.map(item =>
              item.type === 'text' ? (
                <FloatingText
                  key={item.id}
                  id={item.id}
                  text={item.text}
                  color={item.color}
                  x={item.c * cellW + cellW / 2}
                  y={item.r * cellH}
                  size={cellW}
                  onDone={removeFx}
                />
              ) : (
                <Burst
                  key={item.id}
                  id={item.id}
                  color={item.color}
                  x={item.c * cellW}
                  y={item.r * cellH}
                  w={cellW}
                  h={cellH}
                  onDone={removeFx}
                />
              )
            )}

            {countdown > 0 ? (
              <View pointerEvents="none" style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Live goals card */}
        {showGoals ? (
          <View style={styles.goalCard}>
            <View style={styles.goalList}>
              <GoalRow
                done={dotsTotal > 0 && dotsCollected >= dotsTotal}
                icon={
                  <Ionicons name="star" size={15} color={COLORS.accent} />
                }
                text={`Collect all ${dotsTotal} points (${dotsCollected}/${dotsTotal})`}
              />

              <GoalRow
                done={questionsTotal === 0 || questionsAnswered >= questionsTotal}
                icon={
                  <View style={styles.goalQuizDot}>
                    <Text style={styles.goalQuizMark}>?</Text>
                  </View>
                }
                text={
                  questionsTotal === 0
                    ? 'No questions in this maze'
                    : `Answer ${questionsTotal} question${
                        questionsTotal === 1 ? '' : 's'
                      } (${Math.min(questionsAnswered, questionsTotal)}/${questionsTotal})`
                }
              />

              <GoalRow
                done={livesLost === 0}
                warn={livesLost > 0}
                icon={<Text style={styles.goalGhostEmoji}>👻</Text>}
                text={
                  livesLost === 0
                    ? 'Avoid the ghosts (no hits yet)'
                    : `Avoid the ghosts (${livesLost} hit${
                        livesLost === 1 ? '' : 's'
                      })`
                }
              />
            </View>

            <Image
              source={GOAL_IMAGE}
              style={styles.goalImage}
              resizeMode="contain"
            />
          </View>
        ) : null}

        {/* On-screen D-pad: press sets the direction, same as a swipe */}
        {showDpad ? (
          <View style={[styles.controls, { alignItems: dpadAlign }]}>
            <View style={styles.controlRow}>
              {renderDpadButton('▲', DIRECTIONS.up)}
            </View>

            <View style={styles.controlRow}>
              {renderDpadButton('◀', DIRECTIONS.left)}
              {renderDpadButton('▼', DIRECTIONS.down)}
              {renderDpadButton('▶', DIRECTIONS.right)}
            </View>
          </View>
        ) : null}

        <Text style={styles.keyboardHint}>{hintText}</Text>
      </ScrollView>

      {/* Joystick visual */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.joystickBase,
          {
            opacity: joyOpacity,
            transform: joyBase.getTranslateTransform(),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.joystickKnob,
            { transform: joyKnob.getTranslateTransform() },
          ]}
        />
      </Animated.View>

      <Modal
        visible={quizVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quizCard}>
            {!quizQuestion ? (
              <View style={styles.quizLoadingBox}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                />
                <Text style={styles.quizLoadingText}>
                  Loading question...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.quizTopRow}>
                  <Text style={styles.quizHeader}>{questionTag}</Text>

                  {streak > 0 ? (
                    <View style={styles.streakBadge}>
                      <Text style={styles.streakBadgeText}>
                        🔥 {streak}
                        {streakMult > 1 ? ` x${streakMult}` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.quizDifficulty}>
                  {difficultyInfo.icon} {difficultyInfo.name}
                  {' • QUIZ NODE'}
                </Text>

                {settings.timerEnabled ? (
                  <QuizTimerBar
                    active={quizVisible && !quizFeedback}
                    resetKey={quizSerial}
                    durationMs={QUIZ_TIME_MS}
                    timeLeftRef={timeLeftRef}
                    onExpire={onQuizExpire}
                  />
                ) : null}

                <Text style={styles.question}>{quizQuestion.q}</Text>

                {quizQuestion.opts.map((option, index) => {
                  const hidden = hiddenOpts.includes(index);
                  const answered = !!quizFeedback;
                  const isCorrect = index === quizQuestion.correct;
                  const isPicked = quizPicked === index;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.answerButton,
                        hidden && styles.answerHidden,
                        answered && isCorrect && styles.answerCorrect,
                        answered && isPicked && !isCorrect && styles.answerWrong,
                      ]}
                      onPress={() => answerQuiz(index)}
                      disabled={answered || hidden}
                    >
                      <View style={styles.answerLetter}>
                        <Text style={styles.answerLetterText}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>

                      <Text style={styles.answerText}>
                        {hidden ? '—' : option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {!quizFeedback ? (
                  <View style={styles.quizPowerRow}>
                    <TouchableOpacity
                      style={[
                        styles.quizPowerButton,
                        (fiftyCount <= 0 || hiddenOpts.length > 0) &&
                          styles.quizPowerDisabled,
                      ]}
                      onPress={applyFifty}
                      disabled={fiftyCount <= 0 || hiddenOpts.length > 0}
                    >
                      <Text style={styles.quizPowerText}>
                        ½ 50/50 ×{fiftyCount}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quizPowerButton,
                        skipCount <= 0 && styles.quizPowerDisabled,
                      ]}
                      onPress={applySkip}
                      disabled={skipCount <= 0}
                    >
                      <Text style={styles.quizPowerText}>
                        ⏭️ Skip ×{skipCount}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {quizFeedback ? (
                  <>
                    <Text style={styles.feedback}>{quizFeedback}</Text>

                    {getExplanation(quizQuestion) ? (
                      <TouchableOpacity
                        style={styles.continueButton}
                        onPress={closeQuiz}
                      >
                        <Text style={styles.resumeText}>CONTINUE</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.questionHint}>
                    {settings.timerEnabled
                      ? 'Answer quickly for a speed bonus.'
                      : 'Choose an answer to continue.'}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={paused && !settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={resumeGame}
      >
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseIcon}>⏸</Text>

            <Text style={styles.pauseTitle}>GAME PAUSED</Text>

            <Text style={styles.pauseSubtitle}>
              {subjectInfo.icon} {subjectInfo.name}
              {'\n'}
              {difficultyInfo.icon} {difficultyInfo.name} • Level {level}
            </Text>

            <TouchableOpacity
              style={styles.resumeButton}
              onPress={resumeGame}
            >
              <Text style={styles.resumeText}>▶ RESUME</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restartButton}
              onPress={() => setSettingsVisible(true)}
            >
              <Text style={styles.restartText}>⚙ SETTINGS</Text>
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

      {settingsModal}
    </View>
  );
}


/* ==========================================================
   STYLES in mazeStyles.js
========================================================== */

