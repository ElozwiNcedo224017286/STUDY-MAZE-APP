# Branch integration — 4 November 2026

Starting main: `33e906c` (`Log in finished`). The working tree was clean.
The original main is retained as `backup/main-before-branch-integration-20261104`.
All remote branch tips were fetched before integration. No source branches were
deleted, and no history was rewritten.

## Branch coverage

| Branch | Tip | Resolution |
| --- | --- | --- |
| Study-Maize | 3e81017 | Already an ancestor of the starting main |
| Testing-branch | 62debdd | Already an ancestor of the starting main |
| aphile-ui-changes | 88e301a | Already an ancestor of the starting main |
| chatbot-merge | 0f9be63 | Already an ancestor of the starting main |
| elozwi | 33e906c | Same commit as the starting main |
| maze-updates | eb88021 | Already an ancestor of the starting main |
| aphile-newUI-integration | ce3fb99 | Merged; retained the newer dashboard, notifications, theme, and trusted balance behavior |
| gonste-merge | ce3fb99 | Same tip as aphile-newUI-integration; covered by that merge |
| luyanda-changes-chatbot | 1294116 | Merged audio/video uploads, video playback, revision lessons, diagrams, progress, and PDF/Word exports |
| maze-ui-updates | 3d3d70f | Integrated the latest maze implementation from its separate Git history, with ancestry recorded in a merge commit |

## Conflict decisions

- Preserve main's authentication, password recovery, roles, active subject,
  teacher chapter selection, server-managed attempts, rewards, and UI theme work.
- Keep Voice Lab's duplicate-send guard, audio cleanup, transcript display, and
  fallback to text. Add uploaded audio/video without replacing those safeguards.
- Keep teacher notes scoped to the active subject, alongside the branch's built-in
  Business Studies revision pack. Preserve the newer Own Notes PDF workflow.
- The maze branch was a standalone snapshot under `STUDY-MAZE-APP-main/` with no
  common Git ancestor. Its older authentication, backend, dashboard, and Android
  configuration were superseded by main. Copy its new maze features into the
  existing app structure instead of importing a second nested app.
- Expose that expanded game as Practice Maze. Retain the chapter-based Maze
  Runner and its trusted rewards. Practice writes no game scores, reward
  balances, or chapter unlocks to Supabase.
- Route online practice questions through Flask so QuizAPI credentials stay on
  the server. Built-in questions and previously cached provider questions remain
  available for practice.
- Use Expo SDK 58-compatible video, sharing, and haptics packages and align
  installed native dependencies with the SDK. Preserve main's navigation version;
  the new maze does not require a navigation migration.

## Integration fixes

- Initialize the practice difficulty from replay/continue parameters.
- Keep practice results and replay routes separate from chapter results.
- Correct the maze player/ghost artwork assignments and four quiz nodes that
  were positioned on walls.
- Reject external questions with missing, ambiguous, or duplicate answers.
- Preserve successful text replies if optional speech generation or audio cache
  writes fail; generate speech only once per request.
- Clear completed AI request timeout timers.
- Replace a developer-specific Flask address in the example environment file
  with documented local/emulator configuration.
- Update the transitive `shell-quote` package to its patched version.

## Validation

- 23 passing JavaScript regression tests cover all 16 practice maps, offline subject banks,
  video-only requests, transcript fallback, external question conversion, and
  PDF/Word export.
- 7 passing Flask regression tests cover health, empty requests, video input, optional
  speech fallback, successful speech, and the read-only question proxy.
- Expo dependency compatibility and Android/iOS/web production bundle checks.
- JavaScript parsing, unresolved-reference review of the merged screens,
  conflict-marker and whitespace checks, and branch ancestry checks.

The tests use mocked provider responses. Authenticated Supabase requests, live
Gemini/TTS/QuizAPI responses, and physical-device microphone/camera/sharing
behavior were not exercised. The local Supabase URL was checked against the
project reference in the existing anon key; the ignored `.env` is not committed.
The in-app browser was unavailable, so interactive visual checks were not run.

An npm audit also identifies pre-existing issues in the navigation 6 dependency
chain and Expo tooling. A major navigation migration or Expo downgrade is outside
this branch integration; the critical `shell-quote` advisory was patched.
