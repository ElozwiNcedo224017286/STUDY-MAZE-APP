# Smart Learn and student navigation

The student navigation is now **Home → Play → Smart Learn → Challenges → Profile**.
Smart Learn restores the four-tool layout from `luyanda-changes-chatbot`:
Maze Mentor, Smart Solver, Revision Notes and Voice Lab. Each tool has its own
focused start screen. Mentor and Solver keep history within their tool. Returning from
a tool takes the learner back to Smart Learn.

Revision Notes contains three sections: Class notes, My PDFs, and Practice pack.
This removes duplicate material shortcuts from Smart Learn and duplicate class
notes from the revision pack. Old `NotesWorkspace` routes redirect into the
correct library section. Subject-scoped PDF validation, generation, history and
stale-request protection remain in place. Switching sections keeps an opened
PDF generation job mounted.

Materials RPC rows can identify a note as `material_id` instead of `id`.
The API and rendering boundary normalize these aliases, remove duplicate rows,
and provide stable React keys for older notes without IDs. Personal notes retain
their validated note IDs and subject boundary. This fixes the reported unique-key
warning without inventing database IDs for legacy material.

Maze Mentor offers editable prompt starters and file-based sessions. Smart Solver
has camera/gallery actions and expandable scan guidance. Voice Lab has three
speaking warm-ups and shows the conversation after the first message. Existing
artwork, violet heroes, theme-aware cards and shared spacing connect these screens.

## Game integration

Play now has one Maze Runner entry. It opens the advanced dashboard imported from
`origin/maze-ui-updates`, including subject search, daily mazes, difficulty levels,
favorites, power-ups and local practice progress. Class chapters remain accessible
inside the dashboard and retain teacher questions and trusted rewards. The old
`MazePractice` route remains available for replay and existing navigation.

Memory Flip and Quiz Rush already had newer server-backed attempt and recovery
logic on main than the older branch snapshots. Their controllers are retained,
with refreshed themed views: responsive animated memory cards, game progress,
chapter quests, question feedback, retry controls and earned-reward results.
The practice maze does not send its device-local tokens to the trusted reward APIs.

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
- Use dark titles with purple accents on the main tab headers. The requested
  tab headings are exactly Challenges and Profile. Dark mode
  uses light text and lavender accents for contrast.
- Centralize typography and spacing in `src/theme/layout.js`, and share header,
  tool-card and action-row components across the app.
- Constrain wide layouts to a readable 960-pixel content area. Use a single
  Smart Learn column on narrow phones or at larger system text sizes.
- Keep account, subject, reward and game behavior alongside the visual changes.
  No production API credentials or permission rules were changed.

## Validation

- 27 JavaScript and 7 Flask regression tests passed, including material identity,
  duplicate rows and subject-boundary regressions.
- Expo dependency compatibility and production bundles for Android, iOS and web.
- 23 cleanup browser checks passed in an isolated preview: all four study tools,
  duplicate/legacy class and PDF notes, mounted PDF state, revision progress,
  mentor prompt drafts, scan tips/history, voice warm-ups, exact tab headings,
  updated maze routing, chapter access, memory completion, quiz completion/retry,
  missing-subject/empty/error states and 320/393/1280-pixel layouts.
- No runtime exceptions or React key warnings appeared during those checks.
- An additional game check verified settled card faces, mismatch clearing and
  recovery after leaving and reopening Memory Flip. Visual review caught and
  fixed flattened 3D card faces in the web preview.
- Visual review of the Home, Smart Learn, Play, Challenges, Profile and study-tool
  screens. The existing main artwork was retained.

The preview uses mocked services and does not exercise live Supabase/Gemini
requests, real-device permissions, or real camera/microphone input.
