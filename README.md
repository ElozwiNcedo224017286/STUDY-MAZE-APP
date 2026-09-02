# Study Maze

A React Native (Expo) mobile app with a Node.js + SQLite backend:
students play three quiz-based games and earn coins; teachers upload lesson
slides and Claude generates quiz questions from them automatically.

```
study-maze-app/
├── backend/     Node.js + Express + SQLite API (accounts, progress, quiz bank, slide→question generation)
└── mobile/      Expo React Native app (the actual mobile app students/teachers install)
```

## 1. Run the backend

```
cd backend
npm install
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY (needed for the teacher's "Generate Questions" feature)
npm start
```

This starts the API on `http://localhost:4000` and creates `studymaze.db` — a real
SQLite database file — automatically on first run. No separate database server
to install.

- `TEACHER_CODE` in `.env` is the access code students must enter to register as
  a teacher (defaults to `TEACH2026`). Change it before giving this to real users.
- `ANTHROPIC_API_KEY` powers the "Generate Questions from Slides" feature. Without
  it, everything else works but that one feature will return an error.

## 2. Run the mobile app

```
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) or press `i` / `a` for a
simulator. This is a real Expo/React Native project — from here it can be built
into an installable `.ipa`/`.apk` with `eas build`, and eventually submitted to
the App Store / Play Store.

### Pointing the app at your backend

Edit `mobile/app.json` → `expo.extra.apiBaseUrl`:

- Simulator on the same machine as the backend: `http://localhost:4000` (default)
- Physical phone via Expo Go: use your computer's LAN IP, e.g. `http://192.168.1.42:4000`
  (localhost on a phone refers to the phone itself, not your computer)
- Once deployed, point it at your real server's URL

## What's implemented

- **Splash screen** with floating, looping animated icons (maze piece, ghost,
  coin, lightning bolt, etc.) before the login screen — a "Get Started" button
  leads into Login/Register.
- **Accounts** stored in the SQLite database: register/login, with a
  Student/Teacher role toggle. Teacher registration requires the access code.
- **Three games**, each with a genuine way to lose, sharing one coin balance:
  - **Maze Runner** — 3 levels, ghosts that actively chase you, 3 lives
  - **Quiz Rush** — 10-second-per-question timed quiz, 3 lives, win by getting
    10 in a row
  - **Memory Flip** — match 8 pairs before a 60-second timer runs out
- **Rewards Shop** — redeem coins for mocked airtime/data/voucher rewards
- **Teacher Dashboard** — upload PDF/PPTX/TXT slides, the backend extracts the
  text and calls Claude to generate 8–12 multiple-choice questions from it,
  the teacher reviews/removes any and publishes them; students then see those
  questions mixed into Maze Runner and Quiz Rush automatically, with a banner
  telling them a custom quiz is active.
- **Back buttons** on every screen except the top-level Hub/Teacher Dashboard.

## Known limitations (things to harden before a real launch)

- **Auth is intentionally simple** — passwords are stored in plain text and
  there's no session token/JWT. Fine for a prototype demo, not for production.
  Add password hashing (bcrypt) and token-based auth before going further.
- **Single shared quiz bank** — publishing replaces the one active question
  set for everyone. A real multi-class product needs a `classes` table and
  per-class quiz banks.
- **PDF text extraction has no OCR** — scanned/image-only slides won't extract
  any text.
- **No push notifications, offline mode, or app store assets** yet.
- The database is SQLite in a single file — great for a pilot, but a multi-school
  deployment should move to Postgres/MySQL (the route files are written so this
  is a matter of swapping `db.js`, not rewriting the routes).
