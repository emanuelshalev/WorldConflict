# Iteration 1 UI build brief (shared by the three UI build agents)

Repo `/home/emanuel/git/WorldConflict`, branch `dev/rc1-synthetic-loop` (now includes: order availability engine, order registry + glossary, month engine payloads, reveal engine + API, feel foundation components). You work in an isolated worktree. FIRST: `git fetch -q origin && git checkout -B <your-branch> origin/dev/rc1-synthetic-loop`, then `ln -s /home/emanuel/git/WorldConflict/node_modules node_modules; ln -s /home/emanuel/git/WorldConflict/ui/node_modules ui/node_modules`. Shell commands need `export PATH=$HOME/.local/share/node/current/bin:$PATH`. Read CLAUDE.md and `devloop/instances/world-conflict/team/frontend-engineer.md`.

## Specs (read the ones for your packages fully, and skim the others)
`devloop/instances/world-conflict/runs/iter-01/design-orders.md`, `design-month.md`, `design-feel.md`, `design-reveal.md`; concepts in `runs/iter-01/concepts/`. Backlog bugs: `runs/iter-01/backlog.md`. QA root causes: `runs/iter-00/qa-repro.md`.

## Building blocks already merged (use them, do not re-create)
- Feel components: `ui/src/components/game/` (CardShell, EffectChips, CardCost, Stamp, CapitalSeal, CapitalSeals, SealFlight, SoundToggle), `ui/src/lib/sound.ts`, `ui/src/lib/motion.ts`, `ui/src/styles/feel.css`, `game.css`, `ui/src/scenes/kinds.ts` (`sceneForDecision`, `avoidRepeat`). Gallery at `/#scenes/feel`.
- Orders: `src/core/availability.ts`, `ui/src/lib/orders.ts` (registry, `ordersFor`, `orderAction`), `ui/src/lib/glossary.ts` (`TERMS`, `term()`); `tests/ui-glossary.spec.ts` PENDING list (remove entries you fix).
- Month engine payloads: `objectiveStatus` (rich), `advice`, `missionImpact`, `orderImpact`, `turnReport.score/drift/...` (types in `ui/src/store/gameStore.ts`).
- Reveal: `GET /api/reveal/:saveId`, `POST/GET /api/runs`, `seedCode` on new-game; types in `src/core/reveal.ts`; UI fixture `tests/fixtures/reveal/payload-hormuz-usa.json`.

## File ownership (to keep three parallel worktrees mergeable)
- **Desk agent** (month UI + desk composition): `Desk.tsx`, `desk/*` (Navigator, Detail, CommandRail incl. CommandStrip, new GoalLine, YourMove, AdvisorList, Coach), `Hud.tsx`, `Drawers.tsx` (MissionPanel), `BackstoryModal.tsx`, `scenes/MonthDebrief.tsx`, `scenes/debrief.css`, new `scenes/ResultCard.tsx`, `ScoreWhy.tsx`, `Chronicle.tsx`, `App.tsx` (mounts), `lib/month.ts`, `lib/coach.ts`, new `DeskStage.tsx`, `desk-stage.css`, `BigMoment.tsx`, `bigmoment.css`, `lib/moments.ts`, `TitleScreen.tsx` only for the B-12 preselect fix.
- **Orders agent**: `src/api/routes/orders` or the orders-menu endpoint addition in `src/api/routes/game.ts` (small, additive), new `ui/src/components/orders/*` (OrderCard, OrderCatalog with search, ConfirmFace), new `ui/src/lib/availability.ts` (client month layer), new `ui/src/lib/pointAt.ts`, `MapActionMenu.tsx`, `CountryDetailPanel.tsx` (dossier), `gameStore.ts` order actions (`queueOrder`, toast), `ActionPreviewModal.tsx`.
- **Reveal agent**: `ui/src/components/reveal/*`, `reveal.css`, `EndScreen.tsx` (host; keep every current action), `EndGameReport.tsx`, new `ui/src/lib/runs.ts`, `ui/src/lib/shareCard.ts`, `gameStore.ts` reveal block (`fetchReveal`, seed fields), `TitleScreen.tsx` "Your record" + seed entry (small, additive, in a clearly separate block), `Seal.tsx`/`VerdictStamp.tsx` if needed.
- Shared touch points: the desk agent mounts the orders agent's `OrderCatalog` inside `Detail.tsx` (All orders) and calls `pointAt()`; agree via the spec APIs (if the other side is not merged yet, code against the documented API and stub minimally). `gameStore.ts` is edited by orders and reveal agents in separate blocks; keep changes additive.

## Quality bar
- It must feel like a crafted game, matching the concepts and the gallery. Check your work visually: build and screenshot real game screens (start a game through the UI with `devloop/kit/kit.mjs` or `driver.mjs`, own port and output folder under `runs/iter-01/shots/<agent>/`) at 1440, 1024 and 390, and look at the PNGs. Compare with the concepts.
- Vocabulary per the glossary; no em dash characters; accessibility (keyboard, 44 px targets, no hover-only info, reduced motion); no idle animation loops (FEEL-7 budget).
- Never remove an existing feature or action; improve or surface it.
- Before committing: `npm test`, `npm run lint`, `cd ui && npm run lint`, `npm run build`, and `node devloop/instances/world-conflict/smoke.mjs <outdir>` against your own dev server if you start one on other ports (do NOT stop the shared servers on 8080/5173; to test your worktree, run `npx vite --port <yourport>` in ui/ with `VITE_API_PROXY` or the existing proxy config pointing at an API you start on another port, e.g. `PORT=<p> npx tsx src/server.ts`).
- Conventional commits ending with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01RqVTaVuGt2htFKjcr1tQt5
- Do not push or merge. Final message: branch, commits, test counts, screenshots paths, acceptance criteria met / not met, and anything the other UI agents must know.
