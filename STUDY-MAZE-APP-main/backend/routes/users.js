const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:username', (req, res) => {
  const user = db.prepare(
    'SELECT username, role, coins, unlockedLevel, highScore, createdAt FROM users WHERE username = ?'
  ).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// Partial update: send only the fields that changed, e.g. { coins: 130 }
router.put('/:username', (req, res) => {
  const { coins, unlockedLevel, highScore } = req.body || {};
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!existing) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`
    UPDATE users SET
      coins = ?,
      unlockedLevel = ?,
      highScore = ?
    WHERE username = ?
  `).run(
    coins ?? existing.coins,
    unlockedLevel ?? existing.unlockedLevel,
    highScore ?? existing.highScore,
    req.params.username
  );

  const user = db.prepare(
    'SELECT username, role, coins, unlockedLevel, highScore, createdAt FROM users WHERE username = ?'
  ).get(req.params.username);
  res.json({ user });
});

module.exports = router;
