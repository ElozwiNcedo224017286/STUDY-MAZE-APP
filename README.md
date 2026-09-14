# Study Maze

Study Maze is an Expo / React Native learning app with student and teacher flows, learning games, AI study tools, and Supabase-backed progress.

The app includes:

- Student and teacher authentication
- Maze Runner, Quiz Rush, and Memory Flip games
- Coins, scores, streaks, and profile progress
- Teacher-created quizzes
- Study notes and class features
- Maze Mentor chat
- Smart Solver for photographed questions
- Optional AI question generation from uploaded study material

## Tech Stack

- **Expo / React Native** for the mobile app
- **Supabase** for Auth, Postgres, Storage, profiles, roles, scores, and quizzes
- **Flask** for the local Smart Learn AI backend
- **Gemini API** for Maze Mentor and Smart Solver
- **Supabase Edge Functions** with OpenAI for optional quiz generation from slides

## Requirements

Install these before running the project:

- Node.js and npm
- Expo Go on your phone, or an Android emulator
- Python 3.10 or newer
- A Supabase project
- A Gemini API key if you want AI tutor / solver features
- An OpenAI API key if you want teacher slide-to-quiz generation

## Project Structure

```text
.
|-- App.js
|-- app.json
|-- package.json
|-- src/
|   |-- api/
|   |-- components/
|   |-- context/
|   |-- navigation/
|   |-- screens/
|   `-- services/
|-- backend/
|   |-- app.py
|   |-- requirements.txt
|   `-- system_instructions.txt
|-- supabase/
|   |-- schema.sql
|   `-- functions/
`-- assets/
```

## 1. Clone Or Open The Project

Open a terminal in the project folder:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP
```

## 2. Install App Dependencies

Install the JavaScript dependencies:

```powershell
npm install
```

This installs Expo, React Native, Supabase, navigation, camera, audio, file picker, and other app dependencies.

## 3. Configure Environment Variables

Create a `.env` file in the project root. You can copy `.env.example` and fill in your own values.

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_TEACHER_CODE=TEACH2024

EXPO_PUBLIC_FLASK_API_URL=http://YOUR_COMPUTER_IP:5000
```

### Important Notes

- Expo only exposes environment variables that start with `EXPO_PUBLIC_`.
- Restart Expo after changing `.env`.
- Do not add a space before URLs.
- If you are using a real phone, your phone and computer must be on the same Wi-Fi network.

### Finding Your Computer IP On Windows

Run:

```powershell
ipconfig
```

Find the `IPv4 Address`, then use it in `.env`:

```env
EXPO_PUBLIC_FLASK_API_URL=http://192.168.68.113:5000
```

For Android emulator, use:

```env
EXPO_PUBLIC_FLASK_API_URL=http://10.0.2.2:5000
```

For local web testing, use:

```env
EXPO_PUBLIC_FLASK_API_URL=http://127.0.0.1:5000
```

## 4. Set Up Supabase

The app uses Supabase for:

- Login and registration
- Student / teacher roles
- User profiles
- Game scores
- Coins and progress
- Teacher quizzes
- Test attempts
- Avatar storage

### Create The Database

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Copy the contents of `supabase/schema.sql`.
4. Run the SQL in your Supabase project.
5. Copy your Supabase URL and anon key into `.env`.

### Auth Settings

The app uses email and password authentication.

If email confirmation is enabled in Supabase, new users must confirm their email before logging in. For demos or local testing, you may want to disable email confirmation in:

```text
Supabase Dashboard > Authentication > Providers > Email
```

### Teacher Accounts

Teacher registration is controlled by:

```env
EXPO_PUBLIC_TEACHER_CODE=TEACH2024
```

When registering as a teacher, enter that code in the app.

## 5. Run The Expo App

Start the Expo development server:

```powershell
npm start
```

or:

```powershell
npx expo start --clear
```

Expo will show a QR code and a command menu.

Common options:

- Scan the QR code with Expo Go on your phone
- Press `a` to open Android
- Press `w` to open web
- Press `r` to reload the app

The available npm scripts are:

```powershell
npm run android
npm run web
npm run ios
```

`npm run ios` requires macOS and an iOS simulator.

## 6. Run The Flask Smart Learn Backend

The AI tutor and solver features call the Flask backend in `backend/app.py`.

Open a second terminal:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP\backend
```

Create a virtual environment:

```powershell
py -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```powershell
pip install -r requirements.txt
```

Create `backend/.env` and add your Gemini key:

```env
GEMINI_API_KEY=your-gemini-api-key
```

You may also place `GEMINI_API_KEY` in the root `.env`; the backend loads both `backend/.env` and the root `.env`.

Start the backend:

```powershell
py app.py
```

The backend runs at:

```text
http://0.0.0.0:5000
```

Test it:

```powershell
curl http://127.0.0.1:5000/health
```

If it works, you should receive a JSON response showing that the Study Maze Smart Learn API is running.

## 7. Optional: Deploy AI Question Generation

The Teacher Dashboard can generate quiz questions from uploaded slides using the Supabase Edge Function:

```text
supabase/functions/generate-questions/index.ts
```

This feature requires an OpenAI API key.

Install the Supabase CLI:

```powershell
npm i -g supabase
```

Login:

```powershell
supabase login
```

Link your Supabase project:

```powershell
supabase link --project-ref your-project-ref
```

Set the OpenAI secret:

```powershell
supabase secrets set OPENAI_API_KEY=sk-your-key
```

Deploy the function:

```powershell
supabase functions deploy generate-questions
```

Until this function is deployed, manual quiz creation still works, but AI generation from slides will not.

## Quick Start

Use two terminals.

Terminal 1, start the AI backend:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP\backend
.\.venv\Scripts\Activate.ps1
py app.py
```

Terminal 2, start the mobile app:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP
npx expo start --clear
```

Then scan the QR code with Expo Go or press `a` for Android.

## Troubleshooting

### Supabase Is Not Configured

Check that `.env` contains:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Then restart Expo.

### Phone Cannot Reach Smart Learn

Check:

- Flask is running
- Your phone and computer are on the same Wi-Fi
- `EXPO_PUBLIC_FLASK_API_URL` uses your computer IPv4 address
- Windows Firewall allows Python
- There is no extra space before the URL in `.env`

### AI Tutor Or Solver Says API Key Is Missing

Add this to `backend/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
```

Then restart Flask.

### New User Cannot Log In

If Supabase email confirmation is enabled, confirm the email first or disable confirmation for local demos.

### Environment Changes Are Not Working

Stop Expo and restart it:

```powershell
npx expo start --clear
```

## Useful Files

- `src/api/supabase.js` - Supabase client setup
- `src/api/client.js` - Quiz and Supabase data API
- `src/api/ai.js` - Flask Smart Learn API client
- `src/context/AuthContext.js` - Auth, roles, progress, and profile state
- `backend/app.py` - Flask AI backend
- `supabase/schema.sql` - Database schema
- `supabase/functions/generate-questions/index.ts` - AI quiz generation function
