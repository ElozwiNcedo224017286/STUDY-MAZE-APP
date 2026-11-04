const test = require('node:test');
const assert = require('node:assert/strict');
const loadModule = require('./load-module.cjs');
const { MAZE_MAPS, prepareMazeMap, SUBJECTS } = loadModule('src/screens/mazePracticeData.js');
const { buildActiveQuestionPool } = loadModule('src/screens/quizBank.js');

for (const [difficulty, maps] of Object.entries(MAZE_MAPS)) {
  for (const map of maps) {
    test(`${difficulty}/${map.id}: all paths, ghosts and quiz nodes are reachable`, () => {
      const original = JSON.stringify(map);
      const { grid } = prepareMazeMap(map);
      const start = map.playerStart;
      assert.equal(grid[start.r][start.c], 0);
      assert.ok(grid.every(row => row.length === grid[0].length));
      const visited = new Set([`${start.r},${start.c}`]);
      const queue = [start];
      for (let i = 0; i < queue.length; i++) {
        const { r, c } = queue[i];
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = r + dr, nc = c + dc, key = `${nr},${nc}`;
          if (grid[nr]?.[nc] !== undefined && grid[nr][nc] !== 1 && !visited.has(key)) {
            visited.add(key);
            queue.push({ r: nr, c: nc });
          }
        }
      }
      grid.forEach((row, r) => row.forEach((value, c) => {
        if (value !== 1) assert.ok(visited.has(`${r},${c}`), `Unreachable cell ${r},${c}`);
      }));
      for (const cell of [...map.ghostStarts, ...map.quizCells]) {
        assert.ok(visited.has(`${cell.r},${cell.c}`), `Invalid spawn ${cell.r},${cell.c}`);
      }
      for (const cell of map.quizCells) assert.equal(grid[cell.r][cell.c], 2);
      grid[start.r][start.c] = 3;
      assert.equal(JSON.stringify(map), original, 'Playing must not mutate the next run');
    });
  }
}

test('every built-in practice subject has valid offline questions', () => {
  for (const subject of SUBJECTS) {
    const questions = buildActiveQuestionPool([], subject.shortName, 'expert');
    assert.ok(questions.length > 0, subject.name);
    for (const question of questions) {
      assert.equal(question.subject, subject.shortName.toUpperCase());
      assert.ok(question.q && question.opts.length >= 2);
      assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < question.opts.length);
    }
  }
});
