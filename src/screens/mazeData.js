/*

GRID LEGEND

1 = WALL
0 = PATH + COLLECTIBLE COIN
2 = QUIZ NODE
3 = VISITED PATH

*/


/* ==========================================================
   SUBJECTS
========================================================== */

export const SUBJECTS = [
  {
    id: 'science',
    name: 'Science',
    shortName: 'Science',
    icon: '🔬',
    description: 'Explore science while solving questions.',
  },

  {
    id: 'english',
    name: 'English',
    shortName: 'English',
    icon: '📚',
    description: 'Test your English knowledge.',
  },

  {
    id: 'engineering',
    name: 'Engineering',
    shortName: 'Engineering',
    icon: '⚙️',
    description: 'Solve engineering problems.',
  },

  {
    id: 'it',
    name: 'Information Technology',
    shortName: 'IT',
    icon: '💻',
    description: 'Test your IT knowledge.',
  },

  {
    id: 'geography',
    name: 'Geography',
    shortName: 'Geography',
    icon: '🌍',
    description: 'Explore geography.',
  },

  {
    id: 'robotics',
    name: 'Robotics',
    shortName: 'Robotics',
    icon: '🤖',
    description: 'Test your robotics knowledge.',
  },

  {
    id: 'mathematics',
    name: 'Mathematics',
    shortName: 'Mathematics',
    icon: '📐',
    description: 'Solve mathematics questions.',
  },

  {
    id: 'business',
    name: 'Business',
    shortName: 'Business',
    icon: '💼',
    description: 'Test your business knowledge.',
  },
];


/* ==========================================================
   DIFFICULTIES
========================================================== */

export const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Easy',
    icon: '🟢',
    description: 'Simple maze with slower ghosts.',
    ghostSpeed: 650,
    coinValue: 1,
    coinReward: 2,
    quizCount: 3,
    unlockLevel: 1,
  },

  {
    id: 'medium',
    name: 'Medium',
    icon: '🟡',
    description: 'More complex routes and faster ghosts.',
    ghostSpeed: 530,
    coinValue: 2,
    coinReward: 3,
    quizCount: 4,
    unlockLevel: 2,
  },

  {
    id: 'hard',
    name: 'Hard',
    icon: '🟠',
    description: 'Complex maze with aggressive ghosts.',
    ghostSpeed: 500,
    coinValue: 3,
    coinReward: 4,
    quizCount: 5,
    unlockLevel: 3,
  },

  {
    id: 'expert',
    name: 'Expert',
    icon: '🔴',
    description: 'The most challenging maze.',
    ghostSpeed: 500,
    coinValue: 5,
    coinReward: 6,
    quizCount: 6,
    unlockLevel: 4,
  },
];


/* ==========================================================
   MAP HELPER
========================================================== */

const createMap = ({
  id,
  name,
  desc,
  grid,
  playerStart,
  ghostStarts,
  quizCells,
}) => ({
  id,
  name,
  desc,

  grid,

  playerStart,

  ghostStarts,

  quizCells,
});



/* ==========================================================
   EASY MAP 
========================================================== */

const EASY_1 = createMap({
  id: 'easy-1',
  name: 'Crossroads',
  desc: 'A simple connected maze with four main routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010001000001',
    '101011101110101',
    '100010000010001',
    '101110111011101',
    '100000100000001',
    '101110101110101',
    '100010100010001',
    '101011101010101',
    '100010000010001',
    '101110111011101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 7, c: 6 },
    { r: 13, c: 7 },
  ],
});


const EASY_2 = createMap({
  id: 'easy-2',
  name: 'Twin Islands',
  desc: 'Two internal wall islands create multiple routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010001000001',
    '101010111010101',
    '100010000010001',
    '101111011110101',
    '100000010000001',
    '101110010111101',
    '100010000010001',
    '101011111010101',
    '100010000010001',
    '101110111011101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 7, c: 7 },
    { r: 13, c: 5 },
  ],
});


const EASY_3 = createMap({
  id: 'easy-3',
  name: 'Open Square',
  desc: 'Open connected corridors for beginners.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111011111101',
    '100000010000001',
    '101111010111101',
    '100000000000001',
    '101111111110101',
    '100000000000001',
    '101011111110101',
    '100010000000001',
    '101011101111101',
    '100000100000001',
    '101110101110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 5, c: 9 },
    { r: 13, c: 7 },
  ],
});


const EASY_4 = createMap({
  id: 'easy-4',
  name: 'Four Corners',
  desc: 'Four connected sections with short branches.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010101000001',
    '101010101110101',
    '100010000000001',
    '101111011111101',
    '100000010000001',
    '101111010111101',
    '100000010000001',
    '101110111011101',
    '100010000010001',
    '101011101110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 7, c: 7 },
    { r: 13, c: 9 },
  ],
});

const EASY_5 = createMap({

  id: 'easy-5',

  name: 'Garden Paths',

  desc: 'Open corridors with simple branches and multiple routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010001000001',
    '101010111010101',
    '100010000010001',
    '101110101110101',
    '100000100000001',
    '101110101110101',
    '100010000010001',
    '101011101110101',
    '100010100010001',
    '101110111011101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 7, c: 7 },
    { r: 13, c: 9 },
  ],

});


const EASY_6 = createMap({

  id: 'easy-6',

  name: 'Little Bridges',

  desc: 'Simple horizontal and vertical bridges connect open areas.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111011111101',
    '100000010000001',
    '101110010111101',
    '100010000010001',
    '101011111010101',
    '100000000000001',
    '101011111010101',
    '100010000010001',
    '101110010111101',
    '100000010000001',
    '101111011111101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 7, c: 7 },
    { r: 13, c: 5 },
  ],

});


const EASY_7 = createMap({

  id: 'easy-7',

  name: 'Roundabout',

  desc: 'A circular-style maze with several easy escape paths.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111111110101',
    '100010000010001',
    '101010111010101',
    '101010101010101',
    '101000101000101',
    '100000000000001',
    '101000101000101',
    '101010101010101',
    '101010111010101',
    '100010000010001',
    '101111111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 7, c: 5 },
    { r: 13, c: 7 },
  ],

});


const EASY_8 = createMap({

  id: 'easy-8',

  name: 'Easy Junction',

  desc: 'Wide junctions make navigation friendly for beginners.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110101110101',
    '100010101000001',
    '101010101011101',
    '100010000010001',
    '101111011110101',
    '100000000000001',
    '101110111010101',
    '100010001010001',
    '101011101110101',
    '100010100000001',
    '101110111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    {
      r: 13,
      c: 13,
    },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 7, c: 7 },
    { r: 13, c: 5 },
  ],

});

/* ==========================================================
   MEDIUM MAP 
========================================================== */

const MEDIUM_1 = createMap({
  id: 'medium-1',
  name: 'Circuit',
  desc: 'A larger network of connected routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110101110101',
    '100010100010001',
    '101011101010101',
    '100000001000001',
    '101111101111101',
    '100000000000001',
    '101111101111101',
    '100000001000001',
    '101010111010101',
    '100010001000001',
    '101110101110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 5, c: 7 },
    { r: 7, c: 7 },
    { r: 13, c: 7 },
  ],
});


const MEDIUM_2 = createMap({
  id: 'medium-2',
  name: 'The Network',
  desc: 'Several intersections create alternative routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011111110101',
    '100010000010001',
    '101110111011101',
    '100000100000001',
    '101110101110101',
    '100000000000001',
    '101110101110101',
    '100000100000001',
    '101110111011101',
    '100010000010001',
    '101011111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 5, c: 5 },
    { r: 7, c: 9 },
    { r: 13, c: 7 },
  ],
});


const MEDIUM_3 = createMap({
  id: 'medium-3',
  name: 'The Grid',
  desc: 'Balanced maze with several short loops.',

  grid: [
    '111111111111111',
    '100000100000001',
    '101110101110101',
    '100010101000001',
    '101010111011101',
    '100010000010001',
    '101111011110101',
    '100000000000001',
    '101011111010101',
    '100010001010001',
    '101110101011101',
    '100000101000001',
    '101110101110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 5, c: 7 },
    { r: 7, c: 7 },
    { r: 13, c: 5 },
  ],
});


const MEDIUM_4 = createMap({
  id: 'medium-4',
  name: 'Maze City',
  desc: 'Multiple intersections with short side passages.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111011111101',
    '100001010000001',
    '101101011011101',
    '100100000010001',
    '101111011110101',
    '100000010000001',
    '101110010111101',
    '100010000000001',
    '101011101110101',
    '100010100010001',
    '101110111011101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 5, c: 5 },
    { r: 7, c: 7 },
    { r: 13, c: 9 },
  ],
});

const MEDIUM_5 = createMap({

  id: 'medium-5',

  name: 'Cross Grid',

  desc: 'A balanced network of corridors with several intersections.',

  grid: [
    '111111111111111',
    '100000100000001',
    '101110101110101',
    '100010101000001',
    '101011101011101',
    '100010000010001',
    '101111011110101',
    '100000000000001',
    '101011111010101',
    '100010001010001',
    '101110101011101',
    '100000101000001',
    '101110101110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 5, c: 9 },
    { r: 7, c: 7 },
    { r: 13, c: 5 },
  ],

});


const MEDIUM_6 = createMap({

  id: 'medium-6',

  name: 'Inner Ring',

  desc: 'An enclosed central structure surrounded by connecting corridors.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111011111101',
    '100001010000001',
    '101101011111101',
    '100100000010001',
    '101111101010101',
    '100000100000001',
    '101011101111101',
    '100010001000001',
    '101110111011101',
    '100000101000001',
    '101111101111101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 5, c: 5 },
    { r: 9, c: 9 },
    { r: 13, c: 7 },
  ],

});




const MEDIUM_7 = createMap({

  id: 'medium-7',

  name: 'Switchback',

  desc: 'Winding corridors force the player to change direction frequently.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111111011101',
    '100000001010001',
    '101111101010101',
    '100000101000001',
    '101110101110101',
    '100010000000001',
    '101011111110101',
    '101000000010101',
    '101011111010101',
    '100010001010001',
    '101110101110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 5, c: 7 },
    { r: 9, c: 5 },
    { r: 13, c: 9 },
  ],

});


const MEDIUM_8 = createMap({

  id: 'medium-8',

  name: 'Central Hub',

  desc: 'Several corridors converge around a central hub.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010101010001',
    '101010101010101',
    '100010000010001',
    '101011111010101',
    '100000000000001',
    '101010111010101',
    '100010000010001',
    '101010111010101',
    '100010101010001',
    '101110101110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 5, c: 5 },
    { r: 7, c: 9 },
    { r: 13, c: 7 },
  ],

});

/* ==========================================================
   HARD MAP 
========================================================== */

const HARD_1 = createMap({
  id: 'hard-1',
  name: 'Labyrinth',
  desc: 'Dense connected corridors with several intersections.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011111110101',
    '100010000010001',
    '101110111011101',
    '100000101000001',
    '101111101111101',
    '100000000000001',
    '101111101111101',
    '100000101000001',
    '101110111011101',
    '100010000010001',
    '101011111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 3, c: 9 },
    { r: 7, c: 7 },
    { r: 11, c: 5 },
    { r: 13, c: 9 },
  ],
});


const HARD_2 = createMap({
  id: 'hard-2',
  name: 'Dark Network',
  desc: 'Dense islands and multiple escape routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010001010001',
    '101011101010101',
    '100010000010001',
    '101110111110101',
    '100000000000001',
    '101011111011101',
    '100010000010001',
    '101110101110101',
    '100000101000001',
    '101111101111101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 7, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 5, c: 5 },
    { r: 7, c: 7 },
    { r: 9, c: 9 },
    { r: 13, c: 7 },
  ],
});


const HARD_3 = createMap({
  id: 'hard-3',
  name: 'Fortress',
  desc: 'Several wall islands create tactical routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111101111101',
    '100000101000001',
    '101110101011101',
    '100010001010001',
    '101011111010101',
    '100000000000001',
    '101010111110101',
    '100010100000001',
    '101110101110101',
    '100000101000001',
    '101111101111101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 5, c: 7 },
    { r: 7, c: 9 },
    { r: 9, c: 5 },
    { r: 13, c: 7 },
  ],
});


const HARD_4 = createMap({
  id: 'hard-4',
  name: 'Crossfire',
  desc: 'Multiple ghost directions and interconnected paths.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011111110101',
    '100010000010001',
    '101110111011101',
    '100000101000001',
    '101111101111101',
    '100000000000001',
    '101111101111101',
    '100000101000001',
    '101110111011101',
    '100010000010001',
    '101011111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 3, c: 9 },
    { r: 7, c: 7 },
    { r: 11, c: 5 },
    { r: 13, c: 9 },
  ],
});

const HARD_5 = createMap({

  id: 'hard-5',

  name: 'Black Corridor',

  desc: 'Dense corridors with narrow tactical routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111101111101',
    '101000101000101',
    '101011101110101',
    '100010000010001',
    '101110111010101',
    '100000101000001',
    '101011101110101',
    '101000100000101',
    '101110111110101',
    '100010001000001',
    '101111101111101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 3, c: 9 },
    { r: 7, c: 7 },
    { r: 11, c: 5 },
    { r: 13, c: 9 },
  ],

});


const HARD_6 = createMap({

  id: 'hard-6',

  name: 'Iron Maze',

  desc: 'Heavy wall formations create dangerous alternate routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011111110101',
    '100010000010001',
    '101110111110101',
    '100000101000001',
    '101111101011101',
    '100000000010001',
    '101011111110101',
    '101010000000101',
    '101011101111101',
    '100010001000001',
    '101110111011101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 5, c: 7 },
    { r: 7, c: 9 },
    { r: 11, c: 5 },
    { r: 13, c: 9 },
  ],

});


const HARD_7 = createMap({

  id: 'hard-7',

  name: 'Deadlock',

  desc: 'Tight passages and deceptive branches test navigation.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111111110101',
    '100010000010001',
    '101010111010101',
    '101010101010001',
    '101010101111101',
    '100000100000001',
    '101111101011101',
    '101000001010001',
    '101011111010101',
    '100010000010001',
    '101110111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 5, c: 5 },
    { r: 7, c: 7 },
    { r: 9, c: 9 },
    { r: 13, c: 7 },
  ],

});


const HARD_8 = createMap({

  id: 'hard-8',

  name: 'Warpath',

  desc: 'Multiple narrow crossings expose the player to ghost attacks.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011101110101',
    '100010101000001',
    '101110101011101',
    '100000101010001',
    '101111101010101',
    '100000000000001',
    '101010111110101',
    '101010100000001',
    '101011101110101',
    '100010001010001',
    '101110111010101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 5, c: 7 },
    { r: 7, c: 5 },
    { r: 11, c: 9 },
    { r: 13, c: 7 },
  ],

});


/* ==========================================================
   EXPERT MAP 
========================================================== */

const EXPERT_1 = createMap({
  id: 'expert-1',
  name: 'The Gauntlet',
  desc: 'Dense routes with four ghosts.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010101010001',
    '101010101010101',
    '100010000010001',
    '101111011110101',
    '100000000000001',
    '101110111011101',
    '100010001000001',
    '101011101110101',
    '100010100010001',
    '101110111011101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 3, c: 5 },
    { r: 7, c: 7 },
    { r: 9, c: 9 },
    { r: 11, c: 5 },
    { r: 13, c: 9 },
  ],
});


const EXPERT_2 = createMap({
  id: 'expert-2',
  name: 'The Fortress',
  desc: 'Tight corridors and multiple ghost approaches.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011111110101',
    '100010000010001',
    '101110111011101',
    '100010001000001',
    '101011101110101',
    '100000000000001',
    '101110101011101',
    '100010101010001',
    '101110111010101',
    '100000001000001',
    '101111101111101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 9 },
    { r: 3, c: 5 },
    { r: 7, c: 7 },
    { r: 9, c: 9 },
    { r: 11, c: 5 },
    { r: 13, c: 7 },
  ],
});



const EXPERT_3 = createMap({
  id: 'expert-3',
  name: 'The Network',
  desc: 'Complex interconnected routes.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110101110101',
    '100010101000001',
    '101010111011101',
    '100010000010001',
    '101111011110101',
    '100000000000001',
    '101110111010101',
    '100010001010001',
    '101011101011101',
    '100010100010001',
    '101110111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 3, c: 9 },
    { r: 7, c: 5 },
    { r: 9, c: 9 },
    { r: 11, c: 5 },
    { r: 13, c: 9 },
  ],
});


const EXPERT_4 = createMap({
  id: 'expert-4',
  name: 'Final Maze',
  desc: 'The ultimate connected challenge.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011101110101',
    '100010001000001',
    '101110111011101',
    '100000100010001',
    '101111101110101',
    '100000000000001',
    '101110111110101',
    '100010100000001',
    '101010111011101',
    '100010001010001',
    '101110111010101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 3, c: 9 },
    { r: 7, c: 7 },
    { r: 9, c: 5 },
    { r: 11, c: 9 },
    { r: 13, c: 7 },
  ],
});

const EXPERT_5 = createMap({

  id: 'expert-5',

  name: 'Nightmare Grid',

  desc: 'Extremely dense interconnected corridors with four ghosts.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110101110101',
    '100010101000001',
    '101011101011101',
    '100010000010001',
    '101111011110101',
    '100000101000001',
    '101011101110101',
    '101000100010001',
    '101110111010101',
    '100010001010001',
    '101110111110101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 3, c: 5 },
    { r: 7, c: 9 },
    { r: 9, c: 5 },
    { r: 11, c: 9 },
    { r: 13, c: 7 },
  ],

});


const EXPERT_6 = createMap({

  id: 'expert-6',

  name: 'Death Circuit',

  desc: 'Long interconnected corridors with dangerous intersections.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101011111110101',
    '100010000010001',
    '101110111010101',
    '100010101010001',
    '101011101110101',
    '100000000000001',
    '101110111010101',
    '100010101010001',
    '101011101110101',
    '100010001000001',
    '101111101111101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 3, c: 9 },
    { r: 7, c: 7 },
    { r: 9, c: 5 },
    { r: 11, c: 9 },
    { r: 13, c: 7 },
  ],

});


const EXPERT_7 = createMap({

  id: 'expert-7',

  name: 'The Prison',

  desc: 'Tight chambers connected by narrow escape passages.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101111111011101',
    '100000001010001',
    '101111101010101',
    '100000101000001',
    '101110101110101',
    '100010000000001',
    '101011111110101',
    '101000001000101',
    '101011101110101',
    '100010100010001',
    '101110111010101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 7 },
    { r: 3, c: 5 },
    { r: 7, c: 9 },
    { r: 9, c: 5 },
    { r: 11, c: 9 },
    { r: 13, c: 7 },
  ],

});

const EXPERT_8 = createMap({

  id: 'expert-8',

  name: 'Final Fortress',

  desc: 'The ultimate maze of narrow corridors and multiple ghost approaches.',

  grid: [
    '111111111111111',
    '100000000000001',
    '101110111011101',
    '100010101010001',
    '101010101010101',
    '100010000010001',
    '101011111110101',
    '100000000000001',
    '101110111010101',
    '100010001010001',
    '101011101110101',
    '100010100010001',
    '101110111010101',
    '100000000000001',
    '111111111111111',
  ],

  playerStart: {
    r: 1,
    c: 1,
  },

  ghostStarts: [
    { r: 13, c: 13 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 7, c: 13 },
  ],

  quizCells: [
    { r: 1, c: 5 },
    { r: 3, c: 9 },
    { r: 7, c: 7 },
    { r: 9, c: 5 },
    { r: 11, c: 9 },
    { r: 13, c: 7 },
  ],

});

/* ==========================================================
   PREDEFINED MAP POOLS
========================================================== */

export const MAZE_MAPS = {
  easy: [
    EASY_1,
    EASY_2,
    EASY_3,
    EASY_4,
  ],

  medium: [
    MEDIUM_1,
    MEDIUM_2,
    MEDIUM_3,
    MEDIUM_4,
  ],

  hard: [
    HARD_1,
    HARD_2,
    HARD_3,
    HARD_4,
  ],

  expert: [
    EXPERT_1,
    EXPERT_2,
    EXPERT_3,
    EXPERT_4,
  ],
};


/* ==========================================================
   GET MAP POOL
========================================================== */

export function getMazeMaps(
  difficulty = 'easy'
) {
  return (
    MAZE_MAPS[difficulty] ||
    MAZE_MAPS.easy
  );
}


/* ==========================================================
   GET RANDOM PREDEFINED MAP
========================================================== */

export function getRandomMaze(
  difficulty = 'easy'
) {
  const maps =
    getMazeMaps(difficulty);

  if (!maps.length) {
    return MAZE_MAPS.easy[0];
  }

  const index =
    Math.floor(
      Math.random() * maps.length
    );

  return maps[index];
}


/* ==========================================================
   PREPARE MAP FOR GAME
========================================================== */

export function prepareMazeMap(mazeMap) {
  const grid = mazeMap.grid.map(row => row.split('').map(Number));

  
  mazeMap.quizCells.forEach(
    cell => {
      if (
        grid[cell.r] &&
        grid[cell.r][cell.c] !== 1
      ) {
        grid[cell.r][cell.c] = 2;
      }
    }
  );

  return {
    ...mazeMap,

    grid,
  };
}