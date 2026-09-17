const express = require('express');
const router = express.Router();
const db = require('../db');

// Mock gate for teacher signup. Replace with real per-school invite codes in production.
const TEACHER_CODE = process.env.TEACHER_CODE || 'TEACH2026';

router.post('/register', (req, res) => {
  const { username, password, role, teacherCode } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const cleanRole = role === 'teacher' ? 'teacher' : 'student';
  if (cleanRole === 'teacher' && (teacherCode || '').toUpperCase() !== TEACHER_CODE) {
    return res.status(403).json({ error: 'Invalid teacher access code.' });
  }
  const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'That username is taken.' });
  }
  db.prepare(`
    INSERT INTO users (username, password, role, coins, unlockedLevel, highScore, createdAt)
    VALUES (?, ?, ?, 0, 1, 0, ?)
  `).run(username, password, cleanRole, Date.now());

  const user = db.prepare('SELECT username, role, coins, unlockedLevel, highScore, createdAt FROM users WHERE username = ?').get(username);
  res.json({ user });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: 'No account found with that username.' });
  if (user.password !== password) return res.status(401).json({ error: 'Incorrect password.' });
  delete user.password;
  res.json({ user });
});

module.exports = router;
