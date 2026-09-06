export const DEFAULT_QUIZ_BANK = [
<<<<<<< HEAD
  { subject: 'MATH', q: 'What is 12 × 8?', opts: ['96', '86', '104', '88'], correct: 0 },
=======
  { subject: 'MATH', q: 'What is 12 x 8?', opts: ['96', '86', '104', '88'], correct: 0 },
>>>>>>> origin/maze-updates
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
<<<<<<< HEAD
=======




// quizBank for maize game
//
// Each question has:
// subject   -> which subject it belongs to
// difficulty -> easy | medium | hard | expert
// q         -> question
// opts      -> answer options
// correct   -> index of correct answer

export const MAZE_QUIZ_BANK = [
  // ============================================================
  // MATHEMATICS
  // ============================================================

  {
    id: 'math-easy-1',
    subject: 'MATHEMATICS',
    difficulty: 'easy',
    q: 'What is 12 × 8?',
    opts: ['96', '86', '104', '88'],
    correct: 0,
  },

  {
    id: 'math-easy-2',
    subject: 'MATHEMATICS',
    difficulty: 'easy',
    q: 'What is 15% of 200?',
    opts: ['20', '25', '30', '35'],
    correct: 2,
  },

  {
    id: 'math-medium-1',
    subject: 'MATHEMATICS',
    difficulty: 'medium',
    q: 'Solve: 3x = 21. What is x?',
    opts: ['6', '7', '8', '9'],
    correct: 1,
  },

  {
    id: 'math-medium-2',
    subject: 'MATHEMATICS',
    difficulty: 'medium',
    q: 'What is the area of a rectangle with length 8 and width 5?',
    opts: ['13', '26', '40', '80'],
    correct: 2,
  },

  {
    id: 'math-hard-1',
    subject: 'MATHEMATICS',
    difficulty: 'hard',
    q: 'What is the derivative of x²?',
    opts: ['x', '2x', 'x²', '2'],
    correct: 1,
  },

  {
    id: 'math-expert-1',
    subject: 'MATHEMATICS',
    difficulty: 'expert',
    q: 'What is the integral of 2x dx?',
    opts: ['x² + C', '2x² + C', 'x + C', '2 + C'],
    correct: 0,
  },

  // ============================================================
  // SCIENCE
  // ============================================================

  {
    id: 'science-easy-1',
    subject: 'SCIENCE',
    difficulty: 'easy',
    q: 'What gas do plants absorb for photosynthesis?',
    opts: [
      'Oxygen',
      'Nitrogen',
      'Carbon dioxide',
      'Hydrogen',
    ],
    correct: 2,
  },

  {
    id: 'science-easy-2',
    subject: 'SCIENCE',
    difficulty: 'easy',
    q: 'What is H₂O commonly known as?',
    opts: [
      'Salt',
      'Water',
      'Oxygen',
      'Hydrogen peroxide',
    ],
    correct: 1,
  },

  {
    id: 'science-medium-1',
    subject: 'SCIENCE',
    difficulty: 'medium',
    q: 'What is the powerhouse of the cell?',
    opts: [
      'Nucleus',
      'Ribosome',
      'Mitochondria',
      'Golgi body',
    ],
    correct: 2,
  },

  {
    id: 'science-medium-2',
    subject: 'SCIENCE',
    difficulty: 'medium',
    q: 'What force keeps planets in orbit around the Sun?',
    opts: [
      'Friction',
      'Gravity',
      'Magnetism',
      'Pressure',
    ],
    correct: 1,
  },

  {
    id: 'science-hard-1',
    subject: 'SCIENCE',
    difficulty: 'hard',
    q: 'What is the basic unit of heredity?',
    opts: [
      'Cell',
      'Gene',
      'Protein',
      'Tissue',
    ],
    correct: 1,
  },

  {
    id: 'science-expert-1',
    subject: 'SCIENCE',
    difficulty: 'expert',
    q: 'Which law states that energy cannot be created or destroyed?',
    opts: [
      'Newton’s First Law',
      'Law of Conservation of Energy',
      'Ohm’s Law',
      'Boyle’s Law',
    ],
    correct: 1,
  },

  // ============================================================
  // ENGLISH
  // ============================================================

  {
    id: 'english-easy-1',
    subject: 'ENGLISH',
    difficulty: 'easy',
    q: "Which word is a synonym for 'diligent'?",
    opts: [
      'Lazy',
      'Hardworking',
      'Careless',
      'Slow',
    ],
    correct: 1,
  },

  {
    id: 'english-easy-2',
    subject: 'ENGLISH',
    difficulty: 'easy',
    q: 'Which word is a noun?',
    opts: [
      'Run',
      'Beautiful',
      'Teacher',
      'Quickly',
    ],
    correct: 2,
  },

  {
    id: 'english-medium-1',
    subject: 'ENGLISH',
    difficulty: 'medium',
    q: 'Which sentence is grammatically correct?',
    opts: [
      'She go to school.',
      'She going to school.',
      'She goes to school.',
      'She gone to school.',
    ],
    correct: 2,
  },

  {
    id: 'english-medium-2',
    subject: 'ENGLISH',
    difficulty: 'medium',
    q: 'What is an antonym of "ancient"?',
    opts: [
      'Old',
      'Modern',
      'Historic',
      'Traditional',
    ],
    correct: 1,
  },

  {
    id: 'english-hard-1',
    subject: 'ENGLISH',
    difficulty: 'hard',
    q: 'Which literary device compares two things using "like" or "as"?',
    opts: [
      'Metaphor',
      'Simile',
      'Irony',
      'Hyperbole',
    ],
    correct: 1,
  },

  {
    id: 'english-expert-1',
    subject: 'ENGLISH',
    difficulty: 'expert',
    q: 'What is the primary purpose of a thesis statement?',
    opts: [
      'To introduce every source',
      'To state the central argument',
      'To provide a bibliography',
      'To summarize the conclusion',
    ],
    correct: 1,
  },

  // ============================================================
  // ENGINEERING
  // ============================================================

  {
    id: 'engineering-easy-1',
    subject: 'ENGINEERING',
    difficulty: 'easy',
    q: 'Which unit is commonly used to measure force?',
    opts: [
      'Watt',
      'Newton',
      'Volt',
      'Ohm',
    ],
    correct: 1,
  },

  {
    id: 'engineering-easy-2',
    subject: 'ENGINEERING',
    difficulty: 'easy',
    q: 'Which material is commonly used as an electrical conductor?',
    opts: [
      'Copper',
      'Rubber',
      'Glass',
      'Wood',
    ],
    correct: 0,
  },

  {
    id: 'engineering-medium-1',
    subject: 'ENGINEERING',
    difficulty: 'medium',
    q: 'What does a circuit breaker primarily do?',
    opts: [
      'Increase voltage',
      'Store electricity',
      'Interrupt excessive current',
      'Generate electricity',
    ],
    correct: 2,
  },

  {
    id: 'engineering-medium-2',
    subject: 'ENGINEERING',
    difficulty: 'medium',
    q: 'What is stress in engineering?',
    opts: [
      'Force per unit area',
      'Mass per unit volume',
      'Distance per unit time',
      'Energy per unit time',
    ],
    correct: 0,
  },

  {
    id: 'engineering-hard-1',
    subject: 'ENGINEERING',
    difficulty: 'hard',
    q: 'What does CAD stand for?',
    opts: [
      'Computer-Aided Design',
      'Central Architecture Device',
      'Computer Analysis Data',
      'Calculated Automated Drawing',
    ],
    correct: 0,
  },

  {
    id: 'engineering-expert-1',
    subject: 'ENGINEERING',
    difficulty: 'expert',
    q: 'Which principle relates stress and strain within the elastic region?',
    opts: [
      'Ohm’s Law',
      'Hooke’s Law',
      'Pascal’s Law',
      'Bernoulli’s Principle',
    ],
    correct: 1,
  },

  // ============================================================
  // INFORMATION TECHNOLOGY
  // ============================================================

  {
    id: 'it-easy-1',
    subject: 'IT',
    difficulty: 'easy',
    q: 'What does CPU stand for?',
    opts: [
      'Central Processing Unit',
      'Computer Personal Unit',
      'Central Program Utility',
      'Control Processing User',
    ],
    correct: 0,
  },

  {
    id: 'it-easy-2',
    subject: 'IT',
    difficulty: 'easy',
    q: 'Which device is commonly used to connect computers to a network?',
    opts: [
      'Router',
      'Monitor',
      'Keyboard',
      'Printer',
    ],
    correct: 0,
  },

  {
    id: 'it-medium-1',
    subject: 'IT',
    difficulty: 'medium',
    q: 'What does SQL stand for?',
    opts: [
      'Structured Query Language',
      'Simple Question Language',
      'System Query Logic',
      'Structured Question List',
    ],
    correct: 0,
  },

  {
    id: 'it-medium-2',
    subject: 'IT',
    difficulty: 'medium',
    q: 'Which data structure uses First-In, First-Out?',
    opts: [
      'Stack',
      'Queue',
      'Tree',
      'Graph',
    ],
    correct: 1,
  },

  {
    id: 'it-hard-1',
    subject: 'IT',
    difficulty: 'hard',
    q: 'What is the main purpose of database indexing?',
    opts: [
      'Encrypt every record',
      'Speed up data retrieval',
      'Delete duplicate tables',
      'Create backups',
    ],
    correct: 1,
  },

  {
    id: 'it-expert-1',
    subject: 'IT',
    difficulty: 'expert',
    q: 'Which normal form removes transitive dependencies?',
    opts: [
      'First Normal Form',
      'Second Normal Form',
      'Third Normal Form',
      'Fourth Normal Form',
    ],
    correct: 2,
  },

  // ============================================================
  // GEOGRAPHY
  // ============================================================

  {
    id: 'geography-easy-1',
    subject: 'GEOGRAPHY',
    difficulty: 'easy',
    q: 'Which is the largest continent?',
    opts: [
      'Africa',
      'Europe',
      'Asia',
      'Australia',
    ],
    correct: 2,
  },

  {
    id: 'geography-easy-2',
    subject: 'GEOGRAPHY',
    difficulty: 'easy',
    q: 'Which ocean is the largest?',
    opts: [
      'Atlantic',
      'Indian',
      'Arctic',
      'Pacific',
    ],
    correct: 3,
  },

  {
    id: 'geography-medium-1',
    subject: 'GEOGRAPHY',
    difficulty: 'medium',
    q: 'Which is the longest river in Africa?',
    opts: [
      'Congo River',
      'Niger River',
      'Nile River',
      'Zambezi River',
    ],
    correct: 2,
  },

  {
    id: 'geography-medium-2',
    subject: 'GEOGRAPHY',
    difficulty: 'medium',
    q: 'What is the imaginary line at 0° latitude called?',
    opts: [
      'Prime Meridian',
      'Equator',
      'Tropic of Cancer',
      'International Date Line',
    ],
    correct: 1,
  },

  {
    id: 'geography-hard-1',
    subject: 'GEOGRAPHY',
    difficulty: 'hard',
    q: 'Which process describes the wearing away of rocks by wind or water?',
    opts: [
      'Deposition',
      'Erosion',
      'Condensation',
      'Evaporation',
    ],
    correct: 1,
  },

  {
    id: 'geography-expert-1',
    subject: 'GEOGRAPHY',
    difficulty: 'expert',
    q: 'What type of plate boundary occurs when two tectonic plates move apart?',
    opts: [
      'Convergent',
      'Transform',
      'Divergent',
      'Subduction',
    ],
    correct: 2,
  },

  // ============================================================
  // ROBOTICS
  // ============================================================

  {
    id: 'robotics-easy-1',
    subject: 'ROBOTICS',
    difficulty: 'easy',
    q: 'Which component allows a robot to detect its surroundings?',
    opts: [
      'Sensor',
      'Battery',
      'Gear',
      'Frame',
    ],
    correct: 0,
  },

  {
    id: 'robotics-easy-2',
    subject: 'ROBOTICS',
    difficulty: 'easy',
    q: 'What provides electrical energy to many mobile robots?',
    opts: [
      'Battery',
      'Wheel',
      'Sensor',
      'Gear',
    ],
    correct: 0,
  },

  {
    id: 'robotics-medium-1',
    subject: 'ROBOTICS',
    difficulty: 'medium',
    q: 'What is an actuator used for in a robot?',
    opts: [
      'Producing movement',
      'Storing data',
      'Displaying images',
      'Measuring temperature only',
    ],
    correct: 0,
  },

  {
    id: 'robotics-medium-2',
    subject: 'ROBOTICS',
    difficulty: 'medium',
    q: 'What does autonomous mean in robotics?',
    opts: [
      'Controlled only by a human',
      'Able to operate with limited human intervention',
      'Unable to move',
      'Powered without electricity',
    ],
    correct: 1,
  },

  {
    id: 'robotics-hard-1',
    subject: 'ROBOTICS',
    difficulty: 'hard',
    q: 'What is feedback used for in a control system?',
    opts: [
      'To compare actual output with desired output',
      'To remove all sensors',
      'To increase battery size',
      'To stop programming',
    ],
    correct: 0,
  },

  {
    id: 'robotics-expert-1',
    subject: 'ROBOTICS',
    difficulty: 'expert',
    q: 'Which algorithm is commonly used for finding a shortest path in a weighted graph?',
    opts: [
      'Dijkstra’s algorithm',
      'Bubble Sort',
      'Binary Search',
      'Insertion Sort',
    ],
    correct: 0,
  },

  // ============================================================
  // BUSINESS
  // ============================================================

  {
    id: 'business-easy-1',
    subject: 'BUSINESS',
    difficulty: 'easy',
    q: 'What is a budget?',
    opts: [
      'A plan for income and expenses',
      'A type of loan',
      'A bank fee',
      'A tax document only',
    ],
    correct: 0,
  },

  {
    id: 'business-easy-2',
    subject: 'BUSINESS',
    difficulty: 'easy',
    q: 'What is revenue?',
    opts: [
      'Money earned by a business',
      'Money borrowed from a bank',
      'A business expense',
      'A tax penalty',
    ],
    correct: 0,
  },

  {
    id: 'business-medium-1',
    subject: 'BUSINESS',
    difficulty: 'medium',
    q: 'What does SWOT stand for?',
    opts: [
      'Strengths, Weaknesses, Opportunities, Threats',
      'Sales, Work, Operations, Technology',
      'Systems, Workforce, Objectives, Targets',
      'Strategy, Wealth, Organisation, Training',
    ],
    correct: 0,
  },

  {
    id: 'business-medium-2',
    subject: 'BUSINESS',
    difficulty: 'medium',
    q: 'What is a stakeholder?',
    opts: [
      'Someone affected by or interested in an organisation',
      'Only the CEO',
      'Only a customer',
      'A type of financial statement',
    ],
    correct: 0,
  },

  {
    id: 'business-hard-1',
    subject: 'BUSINESS',
    difficulty: 'hard',
    q: 'What is opportunity cost?',
    opts: [
      'The value of the next best alternative given up',
      'The total cost of production',
      'The price of advertising',
      'A fixed business expense',
    ],
    correct: 0,
  },

  {
    id: 'business-expert-1',
    subject: 'BUSINESS',
    difficulty: 'expert',
    q: 'What does competitive advantage describe?',
    opts: [
      'A factor that allows a business to outperform competitors',
      'A business loan',
      'A legal requirement',
      'A type of tax',
    ],
    correct: 0,
  },

  // ============================================================
  // HISTORY
  // ============================================================

  {
    id: 'history-medium-1',
    subject: 'HISTORY',
    difficulty: 'medium',
    q: 'In which year did South Africa hold its first democratic election?',
    opts: [
      '1990',
      '1994',
      '1998',
      '2000',
    ],
    correct: 1,
  },

  // ============================================================
  // LIFE SKILLS
  // ============================================================

  {
    id: 'life-easy-1',
    subject: 'LIFE SKILLS',
    difficulty: 'easy',
    q: 'Which best describes a monthly budget?',
    opts: [
      'A guess about spending',
      'A plan for income and expenses',
      'A type of loan',
      'A bank fee',
    ],
    correct: 1,
  },
];


// ============================================================
// HELPERS
// ============================================================

function normalize(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}


// ============================================================
// BUILD ACTIVE QUESTION POOL for the maze game
// ============================================================
//
// customQuestions  will   comes from the teacher/API.
//

export function buildActiveQuestionPool(
  customQuestions = [],
  subject = null,
  difficulty = null
) {
  const allQuestions = [
    ...MAZE_QUIZ_BANK,
    ...(customQuestions || []),
  ];

  const normalizedSubject = normalize(subject);
  const normalizedDifficulty = normalize(difficulty);

  let filtered = allQuestions.filter((question) => {
    const questionSubject = normalize(question.subject);
    const questionDifficulty = normalize(question.difficulty);

    const subjectMatches =
      !normalizedSubject ||
      questionSubject === normalizedSubject;

    const difficultyMatches =
      !normalizedDifficulty ||
      !questionDifficulty ||
      questionDifficulty === normalizedDifficulty;

    return subjectMatches && difficultyMatches;
  });

  // If there aren't enough questions for the selected subject/difficulty, fall back to the subject.
  if (filtered.length < 3 && normalizedSubject) {
    filtered = allQuestions.filter(
      (question) =>
        normalize(question.subject) === normalizedSubject
    );
  }

  // Final fallback.
  if (filtered.length === 0) {
    filtered = allQuestions;
  }

  return shuffle(filtered);
}
>>>>>>> origin/maze-updates
