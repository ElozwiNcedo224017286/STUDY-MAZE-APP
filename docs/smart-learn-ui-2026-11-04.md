# Smart Learn and student navigation

The student navigation is now **Home → Play → Smart Learn → Challenges → Profile**.
Smart Learn restores the four-tool layout from `luyanda-changes-chatbot`:
Maze Mentor, Smart Solver, Revision Notes and Voice Lab. Its history button opens
mentor conversations directly. The tools remain stack screens so returning from
a tool takes the learner back to Smart Learn.

Teacher notes and Own notes sit beneath the tools as study-material shortcuts.
They open `NotesWorkspaceScreen`, which preserves the integrated subject-scoped
PDF upload, validation, generation, history and stale-request protection logic.
Switching between the two notes panes keeps an opened generation job mounted.

The fourth tab uses the existing active-class-challenge and leaderboard APIs.
It shows the learner's rank and XP, preserves the server's ordering, and links to
daily streaks, rewards and achievements. Loading, retry and no-challenge states
are available. Teacher and administrator navigation retain their existing roles
and destinations.

## Visual direction

- Keep main's illustrated welcome screen, Home hero, game artwork, profile
  artwork, violet gradients and background structure.
- Apply Luyanda's clear hierarchy across the primary screens: 28-pixel page
  headings, 20-pixel section headings, readable body text, 20-pixel page gutters,
  12–24-pixel spacing, and consistent card corners.
- Use dark titles with purple accent words on the main tab headers. Dark mode
  uses light text and lavender accents for contrast.
- Centralize typography and spacing in `src/theme/layout.js`, and share header,
  tool-card and action-row components across the app.
- Constrain wide layouts to a readable 960-pixel content area. Use a single
  Smart Learn column on narrow phones or at larger system text sizes.
- Keep account, subject, reward and game behavior alongside the visual changes.
  No production API credentials or permission rules were changed.

## Validation

- 23 JavaScript and 7 Flask regression tests passed.
- Expo dependency compatibility and production bundles for Android, iOS and web.
- 20 browser checks passed in an isolated preview with fixture account and challenge data:
  tool navigation, chat history, notes-pane switching, challenge shortcuts,
  empty/error states, narrow/dark and wide/light layouts, and role navigation.
- Visual review of the Home, Smart Learn, Play, Challenges, Profile and study-tool
  screens. The existing main artwork was retained.

The preview uses mocked services and does not exercise live Supabase/Gemini
requests, real-device permissions, or real camera/microphone input.
