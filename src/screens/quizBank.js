export const DEFAULT_QUIZ_BANK = [
  { subject: 'MATH', q: 'What is 12 x 8?', opts: ['96', '86', '104', '88'], correct: 0 },
  { subject: 'SCIENCE', q: 'What gas do plants absorb for photosynthesis?', opts: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], correct: 2 },
  { subject: 'HISTORY', q: "In which year did South Africa hold its first democratic election?", opts: ['1990', '1994', '1998', '2000'], correct: 1 },
  { subject: 'ENGLISH', q: "Which word is a synonym for 'diligent'?", opts: ['Lazy', 'Hardworking', 'Careless', 'Slow'], correct: 1 },
  { subject: 'MATH', q: 'Solve: 3x = 21. What is x?', opts: ['6', '7', '8', '9'], correct: 1 },
  { subject: 'GEOGRAPHY', q: 'Which is the longest river in Africa?', opts: ['Congo River', 'Niger River', 'Nile River', 'Zambezi River'], correct: 2 },
  { subject: 'SCIENCE', q: 'What is the powerhouse of the cell?', opts: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correct: 2 },
  { subject: 'LIFE SKILLS', q: 'Which of these best describes a monthly budget?', opts: ['A guess about spending', 'A plan for income and expenses', 'A type of loan', 'A bank fee'], correct: 1 },
  { subject: 'MATH', q: 'What is 15% of 200?', opts: ['20', '25', '30', '35'], correct: 2 },
  { subject: 'SCIENCE', q: 'What is H2O more commonly known as?', opts: ['Salt', 'Water', 'Oxygen', 'Hydrogen peroxide'], correct: 1 }
];

// Merges the built-in bank with whatever a teacher has published (if anything).
export function buildActivePool(customQuestions) {
  if (customQuestions && customQuestions.length) {
    return [...DEFAULT_QUIZ_BANK, ...customQuestions];
  }
  return DEFAULT_QUIZ_BANK;
}




/*
 * Local offline question bank.
 * Used only as a top-up when teacher sets, QuizAPI and the cache
 * don't give the maze enough questions.
 *
 * Question shape: { subject, difficulty, q, opts, correct, explanation? }
 */

const make = (subject, difficulty, q, opts, correct) => ({
  subject,
  difficulty,
  q,
  opts,
  correct,
  source: 'local',
});

export const LOCAL_QUIZ_BANK = [
  // MATHEMATICS
  make('MATHEMATICS', 'easy', 'What is 12 × 8?', ['96', '86', '104', '88'], 0),
  make('MATHEMATICS', 'easy', 'What is 15% of 200?', ['20', '25', '30', '35'], 2),
  make('MATHEMATICS', 'medium', 'Solve: 3x = 21. What is x?', ['6', '7', '8', '9'], 1),
  make('MATHEMATICS', 'medium', 'What is the area of a rectangle with length 8 and width 5?', ['13', '26', '40', '80'], 2),

  // SCIENCE
  make('SCIENCE', 'easy', 'What gas do plants absorb for photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2),
  make('SCIENCE', 'easy', 'What is H2O more commonly known as?', ['Salt', 'Water', 'Oxygen', 'Hydrogen peroxide'], 1),
  make('SCIENCE', 'medium', 'What is the powerhouse of the cell?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 2),
  make('SCIENCE', 'medium', 'What force keeps planets in orbit around the Sun?', ['Friction', 'Gravity', 'Magnetism', 'Pressure'], 1),

  // ENGLISH
  make('ENGLISH', 'easy', "Which word is a synonym for 'diligent'?", ['Lazy', 'Hardworking', 'Careless', 'Slow'], 1),
  make('ENGLISH', 'easy', 'Which word is a noun?', ['Run', 'Beautiful', 'Teacher', 'Quickly'], 2),
  make('ENGLISH', 'medium', 'Which sentence is grammatically correct?', ['She go to school.', 'She going to school.', 'She goes to school.', 'She gone to school.'], 2),

  // ENGINEERING
  make('ENGINEERING', 'easy', 'Which unit is commonly used to measure force?', ['Watt', 'Newton', 'Volt', 'Ohm'], 1),
  make('ENGINEERING', 'medium', 'What does a circuit breaker primarily do?', ['Increase voltage', 'Store electricity', 'Interrupt excessive current', 'Generate electricity'], 2),

  // IT
  make('IT', 'easy', 'What does CPU stand for?', ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Processing User'], 0),
  make('IT', 'medium', 'What does SQL stand for?', ['Structured Query Language', 'Simple Question Language', 'System Query Logic', 'Structured Question List'], 0),
  make('IT', 'medium', 'Which data structure uses First-In, First-Out?', ['Stack', 'Queue', 'Tree', 'Graph'], 1),

  // GEOGRAPHY
  make('GEOGRAPHY', 'easy', 'Which is the largest continent?', ['Africa', 'Europe', 'Asia', 'Australia'], 2),
  make('GEOGRAPHY', 'medium', 'Which is the longest river in Africa?', ['Congo River', 'Niger River', 'Nile River', 'Zambezi River'], 2),

  // ROBOTICS
  make('ROBOTICS', 'easy', 'Which component allows a robot to detect its surroundings?', ['Sensor', 'Battery', 'Gear', 'Frame'], 0),
  make('ROBOTICS', 'medium', 'What is an actuator used for in a robot?', ['Producing movement', 'Storing data', 'Displaying images', 'Measuring temperature only'], 0),

  // BUSINESS
  make('BUSINESS', 'easy', 'What is a budget?', ['A plan for income and expenses', 'A type of loan', 'A bank fee', 'A tax document only'], 0),
  make('BUSINESS', 'medium', 'What does SWOT stand for?', ['Strengths, Weaknesses, Opportunities, Threats', 'Sales, Work, Operations, Technology', 'Systems, Workforce, Objectives, Targets', 'Strategy, Wealth, Organisation, Training'], 0),

  // HISTORY / LIFE SKILLS
  make('HISTORY', 'medium', 'In which year did South Africa hold its first democratic election?', ['1990', '1994', '1998', '2000'], 1),
  make('LIFE SKILLS', 'easy', 'Which best describes a monthly budget?', ['A guess about spending', 'A plan for income and expenses', 'A type of loan', 'A bank fee'], 1),
];

const normalize = value => String(value || '').trim().toUpperCase();

/**
 * Filters the local bank (plus any extra questions) by subject and difficulty.
 * Falls back to subject-only, then to the whole bank, so the maze always
 * has something to ask.
 */
export function buildActiveQuestionPool(
  customQuestions = [],
  subject = null,
  difficulty = null
) {
  const all = [...LOCAL_QUIZ_BANK, ...(customQuestions || [])];

  const wantedSubject = normalize(subject);
  const wantedDifficulty = normalize(difficulty);

  const subjectMatches = question =>
    !wantedSubject || normalize(question.subject) === wantedSubject;

  const difficultyMatches = question =>
    !wantedDifficulty ||
    !question.difficulty ||
    normalize(question.difficulty) === wantedDifficulty;

  let pool = all.filter(q => subjectMatches(q) && difficultyMatches(q));

  if (pool.length < 3 && wantedSubject) {
    pool = all.filter(subjectMatches);
  }

  if (pool.length === 0) {
    pool = all;
  }

  return pool;
}