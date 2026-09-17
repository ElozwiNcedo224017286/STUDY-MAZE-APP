

/*
 * Study Maze — QuizAPI integration
 *
 * Responsibilities:
 * 1. Search QuizAPI by a user-entered subject.
 * 2. Check whether questions are available.
 * 3. Fetch questions for a selected quiz.
 * 4. Convert QuizAPI questions into Study Maze format.
 * 5. Filter questions by subject/difficulty.
 * 6. Check answers.
 */

const QUIZAPI_BASE_URL = 'https://quizapi.io/api/v1';

const QUIZAPI_KEY =
  process.env.EXPO_PUBLIC_QUIZAPI_KEY;

/* ==========================================================
   BASIC HELPERS
========================================================== */

function cleanText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalize(value) {
  return cleanText(value).toLowerCase();
}

function normalizeDifficulty(value) {
  const valueNormalized = normalize(value);

  const aliases = {
    easy: 'easy',
    beginner: 'easy',

    medium: 'medium',
    intermediate: 'medium',

    hard: 'hard',
    advanced: 'hard',

    expert: 'expert',
  };

  return aliases[valueNormalized] || valueNormalized;
}

/* ==========================================================
   QUIZAPI REQUEST
========================================================== */

async function quizApiRequest(endpoint, params = {}) {
  if (!QUIZAPI_KEY) {
    throw new Error(
      'QuizAPI key is missing. Add EXPO_PUBLIC_QUIZAPI_KEY to your .env file.'
    );
  }

  const url = new URL(
    `${QUIZAPI_BASE_URL}${endpoint}`
  );

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      url.searchParams.append(
        key,
        String(value)
      );
    }
  });

  const response = await fetch(
    url.toString(),
    {
      method: 'GET',

      headers: {
        Authorization:
          `Bearer ${QUIZAPI_KEY}`,

        Accept:
          'application/json',

        'Content-Type':
          'application/json',
      },
    }
  );

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
      data?.error ||
      data?.message ||
      `QuizAPI request failed (${response.status}).`
    );
  }

  if (data?.success === false) {
    throw new Error(
      data?.error ||
      data?.message ||
      'QuizAPI request failed.'
    );
  }

  return data;
}

/* ==========================================================
   SEARCH QUIZAPI BY SUBJECT
========================================================== */

/*
 * Search for any subject entered by the user.
 *
 * Examples:
 * searchSubject('Python')
 * searchSubject('Mathematics')
 * searchSubject('Cybersecurity')
 * searchSubject('JavaScript')
 * searchSubject('Geography')
 */

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
    const response = await quizApiRequest(
      '/quizzes',
      {
        topic: searchTerm,
        limit: 50,
        sort: 'title',
      }
    );

    const quizzes = Array.isArray(response?.data)
      ? response.data
      : [];

    /*
     * QuizAPI's current quiz object provides
     * questionCount.
     */
    const availableQuizzes = quizzes.filter(
      quiz =>
        Number(
          quiz?.questionCount || 0
        ) > 0
    );

    const questionCount =
      availableQuizzes.reduce(
        (total, quiz) =>
          total +
          Number(
            quiz?.questionCount || 0
          ),
        0
      );

    return {
      available:
        availableQuizzes.length > 0,

      subject:
        searchTerm,

      quizzes:
        availableQuizzes,

      questionCount,

      quizCount:
        availableQuizzes.length,

      message:
        availableQuizzes.length > 0
          ? `"${searchTerm}" is available.`
          : `"${searchTerm}" was not found on QuizAPI.`,

      error: null,
    };
  } catch (error) {
    console.error(
      'QuizAPI subject search failed:',
      error
    );

    return {
      available: false,

      subject:
        searchTerm,

      quizzes: [],

      questionCount: 0,

      quizCount: 0,

      error:
        error?.message ||
        'Unknown QuizAPI error.',

      message:
        'Could not search QuizAPI.',
    };
  }
}

/*
 * Compatibility name used by MazeGameScreen.
 *
 * This means either of these works:
 *
 * searchSubject()
 * searchQuizAPISubject()
 */

export async function searchQuizAPISubject(
  subject
) {
  return searchSubject(subject);
}

/* ==========================================================
   GET QUESTIONS FOR A QUIZ
========================================================== */

export async function getQuizQuestions(
  quizId
) {
  if (!quizId) {
    return [];
  }

  try {
    const response =
      await quizApiRequest(
        '/questions',
        {
          quiz_id: quizId,

          include_answers:
            'true',

          limit: 50,
        }
      );

    const questions =
      Array.isArray(response?.data)
        ? response.data
        : [];

    return questions
      .map(convertQuizAPIQuestion)
      .filter(Boolean);

  } catch (error) {
    console.error(
      `Could not load QuizAPI quiz ${quizId}:`,
      error
    );

    return [];
  }
}

/* ==========================================================
   GET QUESTIONS FOR A SUBJECT
========================================================== */

export async function getQuestionsForSubject(
  subject,
  difficulty = null
) {
  const searchResult =
    await searchSubject(subject);

  if (!searchResult.available) {
    return [];
  }

  /*
   * Do not request hundreds of quizzes.
   * The first 10 matching quizzes are enough
   * to create a usable maze question pool.
   */

  const quizzes =
    searchResult.quizzes.slice(0, 10);

  const questionResults =
    await Promise.all(
      quizzes.map(
        quiz =>
          getQuizQuestions(
            quiz.id
          )
      )
    );

  let questions =
    questionResults.flat();

  /*
   * Remove invalid questions.
   */

  questions =
    questions.filter(
      question =>
        question &&
        question.q &&
        Array.isArray(question.opts) &&
        question.opts.length >= 2
    );

  /*
   * Attach the searched subject.
   */

  questions =
    questions.map(
      question => ({
        ...question,

        subject:
          cleanText(subject),
      })
    );

  /*
   * Filter by difficulty when possible.
   *
   * If QuizAPI has no questions at that
   * difficulty, keep the original questions
   * instead of giving the maze an empty pool.
   */

  if (difficulty) {
    const wanted =
      normalizeDifficulty(
        difficulty
      );

    const filtered =
      questions.filter(
        question =>
          normalizeDifficulty(
            question.difficulty
          ) === wanted
      );

    if (filtered.length > 0) {
      questions = filtered;
    }
  }

  return shuffle(questions);
}

/* ==========================================================
   CONVERT QUIZAPI QUESTION
========================================================== */

/*
 * Converts QuizAPI's current response:
 *
 * {
 *   id,
 *   quizId,
 *   text,
 *   difficulty,
 *   category,
 *   explanation,
 *   answers: [
 *     {
 *       id,
 *       text,
 *       isCorrect
 *     }
 *   ]
 * }
 *
 * into the Study Maze format:
 *
 * {
 *   id,
 *   q,
 *   opts,
 *   correct
 * }
 */

export function convertQuizAPIQuestion(
  question
) {
  if (!question) {
    return null;
  }

  /*
   * Current QuizAPI uses "text".
   *
   * Older responses may have used "question".
   */
  const questionText =
    cleanText(
      question.text ||
      question.question
    );

  if (!questionText) {
    return null;
  }

  /*
   * Current QuizAPI returns answers as
   * an array.
   *
   * We also support the older object format
   * so existing data does not break.
   */

  let answers = [];

  if (
    Array.isArray(
      question.answers
    )
  ) {
    answers =
      question.answers
        .filter(
          answer =>
            answer &&
            (
              answer.text ||
              answer.answer
            )
        )
        .map(answer => ({
          text:
            cleanText(
              answer.text ||
              answer.answer
            ),

          correct:
            answer.isCorrect === true ||
            answer.isCorrect === 'true' ||
            answer.is_correct === true ||
            answer.is_correct === 'true',
        }));
  } else if (
    question.answers &&
    typeof question.answers === 'object'
  ) {
    answers =
      Object.entries(
        question.answers
      )
        .filter(
          ([, answer]) =>
            answer &&
            (
              answer.answer ||
              answer.text
            )
        )
        .map(
          ([key, answer]) => ({
            key,

            text:
              cleanText(
                answer.answer ||
                answer.text
              ),

            correct:
              answer.isCorrect === true ||
              answer.isCorrect === 'true' ||
              answer.is_correct === true ||
              answer.is_correct === 'true',
          })
        );
  }

  if (answers.length < 2) {
    return null;
  }

  const correctIndex =
    answers.findIndex(
      answer =>
        answer.correct
    );

  /*
   * A question without a known correct
   * answer cannot safely be used by the game.
   */

  if (correctIndex < 0) {
    return null;
  }

  return {
    id:
      `quizapi-${question.id}`,

    source:
      'quizapi',

    quizId:
      question.quizId ||
      question.quiz_id ||
      null,

    quizQuestionId:
      question.id,

    subject:
      cleanText(
        question.categoryName ||
        question.category ||
        question.topic ||
        'General'
      ),

    difficulty:
      cleanText(
        question.difficulty ||
        'medium'
      ).toLowerCase(),

    q:
      questionText,

    opts:
      answers.map(
        answer =>
          answer.text
      ),

    correct:
      correctIndex,

    explanation:
      question.explanation ||
      null,
  };
}

/* ==========================================================
   CHECK ANSWER
========================================================== */

export function checkAnswer(
  question,
  selectedIndex
) {
  if (!question) {
    return false;
  }

  return (
    typeof question.correct === 'number' &&
    selectedIndex ===
      question.correct
  );
}

/* ==========================================================
   GET QUIZ BANK
========================================================== */

/*
 * Supports BOTH:
 *
 * getQuizBank('Python', 'easy')
 *
 * and:
 *
 * getQuizBank({
 *   subject: 'Python',
 *   difficulty: 'easy'
 * })
 *
 * This is important because your
 * MazeGameScreen uses the object form.
 */

export async function getQuizBank(
  subjectOrOptions = null,
  difficulty = null
) {
  let subject =
    subjectOrOptions;

  /*
   * Object form
   */

  if (
    subjectOrOptions &&
    typeof subjectOrOptions === 'object'
  ) {
    subject =
      subjectOrOptions.subject;

    difficulty =
      subjectOrOptions.difficulty;
  }

  subject =
    cleanText(subject);

  if (!subject) {
    return {
      questions: [],
      source: 'quizapi',
      subject: '',
      difficulty:
        difficulty || null,
    };
  }

  const questions =
    await getQuestionsForSubject(
      subject,
      difficulty
    );

  return {
    questions,

    source:
      'quizapi',

    subject,

    difficulty:
      difficulty || null,
  };
}

/* ==========================================================
   CHECK SUBJECT AVAILABILITY
========================================================== */

export async function checkSubjectAvailability(
  subject
) {
  const result =
    await searchSubject(
      subject
    );

  return {
    subject:
      result.subject,

    available:
      result.available,

    questionCount:
      result.questionCount,

    quizCount:
      result.quizCount,

    quizzes:
      result.quizzes,

    message:
      result.message,

    error:
      result.error || null,
  };
}

/* ==========================================================
   SHUFFLE
========================================================== */

function shuffle(array) {
  const result = [
    ...array,
  ];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      result[i],
      result[j],
    ] = [
      result[j],
      result[i],
    ];
  }

  return result;
}