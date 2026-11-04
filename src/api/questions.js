

/*
 * Study Maze — QuizAPI service (the only one).
 *
 * 1. Search QuizAPI by a user-entered subject.
 * 2. Fetch questions (by quiz first, then by category as a fallback).
 * 3. Convert them to the game format: { id, q, opts, correct, ... }.
 */

import { aiApi } from './ai';

/* Try to have at least this many questions before skipping the fallback. */
const MIN_POOL_SIZE = 8;

/* ==========================================================
   SUBJECT -> QUIZAPI CATEGORIES
   Keys are lowercase subject names/aliases.
========================================================== */

const IT_CATEGORIES = [
  'Programming', 'Database', 'Databases', 'Data Structures',
  'Software Engineering', 'Web Development', 'REST API',
  'SQL Queries', 'JavaScript', 'Python', 'Java', 'C++',
];

const SUBJECT_CATEGORY_MAP = {
  mathematics: ['Mathematics'],
  science: ['Science', 'Physics', 'Chemistry', 'Biology'],
  english: [
    'Languages', 'Literature', 'Literary Devices',
    'Classic Literature', 'Poetry', 'Shakespeare',
  ],
  engineering: ['Engineering', 'Architecture'],
  it: IT_CATEGORIES,
  'information technology': IT_CATEGORIES,
  geography: ['Geography', 'Countries', 'World Capitals', 'Rivers', 'Mountains'],
  robotics: ['Robotics'],
  business: [
    'Business & Finance', 'Economics', 'Marketing', 'Entrepreneurship',
    'Investing', 'Personal Finance', 'Supply Chain',
  ],
  history: [
    'History', 'Ancient History', 'Ancient Rome', 'Ancient Greece',
    'Medieval History', 'Industrial Revolution', 'World Wars', 'Cold War',
  ],
  'life skills': ['Personal Finance', 'Health'],
};

/* Topic names offered by the search-ahead box. */
export const SUGGESTION_TOPICS = [
  ...new Set(Object.values(SUBJECT_CATEGORY_MAP).flat()),
];

/* ==========================================================
   HELPERS
========================================================== */

const cleanText = value => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalize = value => cleanText(value).toLowerCase();

const DIFFICULTY_ALIASES = {
  easy: 'easy',
  beginner: 'easy',
  medium: 'medium',
  intermediate: 'medium',
  hard: 'hard',
  advanced: 'hard',
  expert: 'expert',
};

const normalizeDifficulty = value => {
  const key = normalize(value);
  return DIFFICULTY_ALIASES[key] || key;
};

const isTrue = value => value === true || value === 'true';

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ==========================================================
   HTTP
========================================================== */

async function quizApiRequest(endpoint, params = {}) {
  const url = new URL(`${aiApi.getBaseUrl()}/api/quiz${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.append(key, String(value));
    }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      `QuizAPI returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || `QuizAPI request failed (${response.status}).`
    );
  }

  if (data?.success === false) {
    throw new Error(data?.error || data?.message || 'QuizAPI request failed.');
  }

  return data;
}

/* ==========================================================
   CONVERT QUIZAPI QUESTION -> GAME QUESTION
   Supports the current array format and the older object format.
========================================================== */

const toAnswerList = raw => {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
    ? Object.values(raw)
    : [];

  return list
    .filter(answer => answer && (answer.text || answer.answer))
    .map(answer => ({
      text: cleanText(answer.text || answer.answer),
      correct: isTrue(answer.isCorrect) || isTrue(answer.is_correct),
    }));
};

export function convertQuizAPIQuestion(question) {
  if (!question || question.id == null) return null;

  const questionText = cleanText(question.text || question.question);
  if (!questionText) return null;

  const answers = toAnswerList(question.answers);
  if (answers.length < 2 || answers.some(answer => !answer.text) ||
      new Set(answers.map(answer => answer.text)).size !== answers.length) return null;

  // Without a known correct answer the game cannot score the question.
  const correctIndex = answers.findIndex(answer => answer.correct);
  if (correctIndex < 0 || answers.filter(answer => answer.correct).length !== 1) return null;

  return {
    id: `quizapi-${question.id}`,
    source: 'quizapi',
    quizId: question.quizId || question.quiz_id || null,
    quizQuestionId: question.id,
    subject: cleanText(
      question.categoryName || question.category || question.topic || 'General'
    ),
    difficulty: cleanText(question.difficulty || 'medium').toLowerCase(),
    q: questionText,
    opts: answers.map(answer => answer.text),
    correct: correctIndex,
    explanation: question.explanation || null,
  };
}

/* ==========================================================
   SEARCH BY SUBJECT
========================================================== */

export async function searchSubject(subject) {
  const searchTerm = cleanText(subject);

  if (!searchTerm) {
    return {
      available: false,
      subject: '',
      quizzes: [],
      questionCount: 0,
      quizCount: 0,
      message: 'Enter a subject to search.',
    };
  }

  try {
    const response = await quizApiRequest('/quizzes', {
      topic: searchTerm,
      limit: 50,
      sort: 'title',
    });

    const quizzes = Array.isArray(response?.data) ? response.data : [];

    const availableQuizzes = quizzes.filter(
      quiz => Number(quiz?.questionCount || 0) > 0
    );

    const questionCount = availableQuizzes.reduce(
      (total, quiz) => total + Number(quiz?.questionCount || 0),
      0
    );

    return {
      available: availableQuizzes.length > 0,
      subject: searchTerm,
      quizzes: availableQuizzes,
      questionCount,
      quizCount: availableQuizzes.length,
      message:
        availableQuizzes.length > 0
          ? `"${searchTerm}" is available.`
          : `"${searchTerm}" was not found on QuizAPI.`,
      error: null,
    };
  } catch (error) {
    console.error('QuizAPI subject search failed:', error);

    return {
      available: false,
      subject: searchTerm,
      quizzes: [],
      questionCount: 0,
      quizCount: 0,
      error: error?.message || 'Unknown QuizAPI error.',
      message: 'Could not search QuizAPI.',
    };
  }
}

/* Name used by the screens. */
export const searchQuizAPISubject = subject => searchSubject(subject);

export async function checkSubjectAvailability(subject) {
  const result = await searchSubject(subject);

  return {
    subject: result.subject,
    available: result.available,
    questionCount: result.questionCount,
    quizCount: result.quizCount,
    quizzes: result.quizzes,
    message: result.message,
    error: result.error || null,
  };
}

/* ==========================================================
   FETCH QUESTIONS
========================================================== */

export async function getQuizQuestions(quizId) {
  if (!quizId) return [];

  try {
    const response = await quizApiRequest('/questions', {
      quiz_id: quizId,
      include_answers: 'true',
      limit: 50,
    });

    const questions = Array.isArray(response?.data) ? response.data : [];
    return questions.map(convertQuizAPIQuestion).filter(Boolean);
  } catch (error) {
    console.error(`Could not load QuizAPI quiz ${quizId}:`, error);
    return [];
  }
}

/* Path 1: find quizzes about the topic, then load their questions. */
async function getQuestionsFromQuizzes(subject) {
  const searchResult = await searchSubject(subject);
  if (!searchResult.available) return [];

  // The first 10 matching quizzes are enough for a usable pool.
  const results = await Promise.all(
    searchResult.quizzes.slice(0, 10).map(quiz => getQuizQuestions(quiz.id))
  );

  return results.flat();
}

/* Path 2 (fallback): ask for questions directly by mapped category. */
async function getQuestionsByCategory(subject, difficulty, limit = 20) {
  const categories = SUBJECT_CATEGORY_MAP[normalize(subject)];
  if (!categories || categories.length === 0) return [];

  const response = await quizApiRequest('/questions', {
    category: categories.join(','),
    difficulty: difficulty
      ? normalizeDifficulty(difficulty).toUpperCase()
      : undefined,
    type: 'MULTIPLE_CHOICE',
    include_answers: 'true',
    limit,
    random: 'true',
  });

  const questions = Array.isArray(response?.data) ? response.data : [];
  return questions.map(convertQuizAPIQuestion).filter(Boolean);
}

export async function getQuestionsForSubject(subject, difficulty = null) {
  let questions = [];

  try {
    questions = await getQuestionsFromQuizzes(subject);
  } catch (error) {
    console.log('QuizAPI quiz lookup failed:', error);
  }

  if (questions.length < MIN_POOL_SIZE) {
    try {
      const byCategory = await getQuestionsByCategory(subject, difficulty);
      questions = [...questions, ...byCategory];
    } catch (error) {
      console.log('QuizAPI category lookup failed:', error);
    }
  }

  // Remove duplicates and invalid questions, and label with the searched subject.
  const unique = new Map();
  questions.forEach(question => {
    if (
      question?.q &&
      Array.isArray(question.opts) &&
      question.opts.length >= 2 &&
      !unique.has(question.id)
    ) {
      unique.set(question.id, { ...question, subject: cleanText(subject) });
    }
  });

  let pool = [...unique.values()];

  // Prefer the requested difficulty, but never leave the maze with an empty pool.
  if (difficulty) {
    const wanted = normalizeDifficulty(difficulty);
    const filtered = pool.filter(
      question => normalizeDifficulty(question.difficulty) === wanted
    );
    if (filtered.length > 0) pool = filtered;
  }

  return shuffle(pool);
}

/* ==========================================================
   PUBLIC API USED BY THE GAME
   getQuizBank('Science', 'easy')  or  getQuizBank({ subject, difficulty })
========================================================== */

export async function getQuizBank(subjectOrOptions = null, difficulty = null) {
  let subject = subjectOrOptions;

  if (subjectOrOptions && typeof subjectOrOptions === 'object') {
    subject = subjectOrOptions.subject;
    difficulty = subjectOrOptions.difficulty;
  }

  subject = cleanText(subject);

  if (!subject) {
    return { questions: [], source: 'quizapi', subject: '', difficulty: difficulty || null };
  }

  const questions = await getQuestionsForSubject(subject, difficulty);

  return { questions, source: 'quizapi', subject, difficulty: difficulty || null };
}

/* ==========================================================
   CHECK ANSWER
========================================================== */

export function checkAnswer(question, selectedIndex) {
  return (
    !!question &&
    typeof question.correct === 'number' &&
    selectedIndex === question.correct
  );
}
