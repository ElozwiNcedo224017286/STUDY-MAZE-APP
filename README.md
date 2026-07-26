# Study Maze

An Expo / React Native learning-games app (maze runner, quiz rush, memory flip) with student and teacher roles, backed by **Supabase** (Auth + Postgres + Storage).

## Getting started

```bash
npm install
npm start
```

## Supabase

The app talks to Supabase directly via `@supabase/supabase-js` — there is no separate backend server.

### Environment variables

Credentials live in `.env` (git-ignored). `EXPO_PUBLIC_*` vars are inlined by Expo at build time, so **restart the dev server after editing `.env`.**

```
EXPO_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
EXPO_PUBLIC_TEACHER_CODE="TEACH2024"   # code required to register a teacher account
```

### Database

The schema (in [`supabase/schema.sql`](supabase/schema.sql)) is already provisioned in the connected project. It uses:

- **Supabase Auth** (`auth.users`) for identity — accounts are email + password.
- `profiles` / `user_roles` — auto-created on signup by the `handle_new_user` trigger, which reads `display_name` and `role` from the sign-up metadata the app sends.
- `game_scores` — append-only; **the single source of truth for coins and scores.** Each finished game inserts a row. Coins shown in the app are the *earned total* (also what the leaderboard sums), so the Rewards Shop unlocks items once enough is earned rather than deducting a balance.
- `tests` / `test_attempts` — teacher-authored quizzes; the app's "publish quiz to students" writes a `tests` row and the games read the latest one.
- `avatars` storage bucket for profile pictures.

### Auth settings

- **Teacher signup:** anyone entering the correct `EXPO_PUBLIC_TEACHER_CODE` at registration is granted the `teacher` role (passed in signup metadata → `user_roles`). This is a client-side gate.
- **Email confirmation:** if it's enabled in your Supabase project (Authentication → Providers → Email), a new account can't log in until the email is confirmed — the app shows a "check your email" message. Disable it in the dashboard for a friction-free demo.

## How the app maps to the schema

| App concept | Supabase |
|---|---|
| Login / register | `supabase.auth` (email + password) |
| Player role | `user_roles` (`student` / `teacher` / `admin`) |
| Coins / high score / unlocked level | aggregated from `game_scores` on each load |
| Teacher publishes questions | insert into `tests`; games read the latest row |
| AI "generate questions from slides" | Supabase Edge Function `generate-questions` (optional, see below) |

Key files: [`src/api/supabase.js`](src/api/supabase.js) (client), [`src/api/client.js`](src/api/client.js) (quiz-bank API over `tests`), [`src/context/AuthContext.js`](src/context/AuthContext.js) (auth + progress).

## AI question generation (Edge Function)

The Teacher Dashboard's "Generate Questions from Slides" calls a Supabase **Edge Function** named `generate-questions`, implemented in [`supabase/functions/generate-questions/index.ts`](supabase/functions/generate-questions/index.ts). It reads the uploaded files (PDFs are sent to the model as file inputs; `.txt` as text — export PPTX to PDF first), asks **OpenAI** for 10 multiple-choice questions via structured outputs (`response_format` json_schema), and returns `{ questions: [{ subject, q, opts, correct }] }`.

### Deploy it

Easiest (no install): Supabase Dashboard → **Edge Functions** → create a function named `generate-questions`, paste the file contents, **Deploy**, then add the `OPENAI_API_KEY` secret under Edge Functions → Secrets.

Or via CLI:

```bash
npm i -g supabase
supabase login
supabase link --project-ref zqhhslrhglcdkotetjtv
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy generate-questions
```

The function uses `gpt-4o-mini` (cheap, supports PDF + JSON schema). Change the `MODEL` constant to `gpt-4o` for higher quality. Until the function is deployed, the generate button returns a clear error and everything else (manual question builder, notes, published, class) works without any API key.
