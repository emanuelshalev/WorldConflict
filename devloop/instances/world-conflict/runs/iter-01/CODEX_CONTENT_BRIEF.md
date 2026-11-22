# Codex content brief (design-learn.md WP2)

You are the Content and Realism Consultant for World Conflict (`devloop/instances/world-conflict/team/content-consultant.md`). Setup in your worktree: `git fetch -q origin && git checkout -B <your-branch> origin/dev/rc1-synthetic-loop`; `ln -s /home/emanuel/git/WorldConflict/node_modules node_modules; ln -s /home/emanuel/git/WorldConflict/ui/node_modules ui/node_modules`; shell commands need `export PATH=$HOME/.local/share/node/current/bin:$PATH`. Read CLAUDE.md, `design-learn.md` (sections on content), D-53 in the ledger, and the codex schema in `src/core/codex.ts` (all objects are strict; `codexIssues()` must return no issues; tests in `tests/codex/schema.spec.ts`). Sample format: `data/codex/seed.json` and `data/codex/situations/ceasefire-or-collapse.json`.

## Writing rules
- `short` (max 140 chars): one plain sentence a 16-year-old and a 67-year-old non-gamer both understand. `long` (max 600): the background, why it matters now. No jargon without explaining it. Neutral, no opinion, no glorifying violence.
- Accuracy as of the entry's `asOf` date; game world is November 2026 for 2026 entries. Verify with WebSearch where unsure; `sources` are real URLs (people and events need at least one). Use `valid` and `eras` for era-specific text (a leader who was in office in 1990 but not in 2026).
- `obscurity`: 1 widely known (Moscow, NATO), 2 news followers know it, 3 specialist. Underlines only show for names the player does not know, so set this honestly.
- `aliases`: the forms used in game text (search `data/` for how names actually appear: flashpoints, scenarios, country profiles, crisis templates in `src/core/crises.ts`, reactions). Use `avoid` to block false matches. Avoid alias clashes with the other content agent (codexIssues flags them).
- No em dash characters. Do not use "credit" for political capital or "Leadership score".

## Process
Write in batches and run `npx vitest run tests/codex` after each batch. At the end: `npm test` green. Commit only `data/codex/**` (and the files named in your task) with a conventional message ending with
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RqVTaVuGt2htFKjcr1tQt5
Do not push or merge. Final message: branch, entry counts by kind, coverage gaps, unverified facts.
