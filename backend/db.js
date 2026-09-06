// db.js — a real embedded SQLite database (file-based, no separate DB server to run).
// Swap this file for a Postgres/MySQL connection later without touching the routes,
// as long as the same functions are exported.
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'studymaze.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    password      TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'student',
    coins         INTEGER NOT NULL DEFAULT 0,
    unlockedLevel INTEGER NOT NULL DEFAULT 1,
    highScore     INTEGER NOT NULL DEFAULT 0,
    createdAt     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    subject   TEXT NOT NULL,
    question  TEXT NOT NULL,
    opts_json TEXT NOT NULL,
    correct   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_meta (
    id        INTEGER PRIMARY KEY CHECK (id = 1),
    topic     TEXT,
    teacher   TEXT,
    updatedAt INTEGER
  );
`);

module.exports = db;
