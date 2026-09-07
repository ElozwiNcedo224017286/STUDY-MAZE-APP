export const DEFAULT_QUIZ_BANK = [
  { subject: 'MATH', q: 'What is 12 × 8?', opts: ['96', '86', '104', '88'], correct: 0 },
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
