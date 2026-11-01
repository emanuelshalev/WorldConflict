# Handoff — engagement overhaul (branch `feat/engagement-overhaul`)

State as of 2026-11-01: every round-2 P0 and P1 item is implemented and pushed. Tests 86/86. Backend lint and UI lint pass with no errors; the backend still has the 8 old Biome warnings. `npm run build` passes. Plan, tasks, blockers and decisions are in `dev_plan/project_status.html`. Reviews are in `dev_plan/reviews/`; round 2 is `player-personas-round2.md`.

## Done in this round (from round 2)

| # | Item | Where |
|---|---|---|
| 1 | Advisors read the mission: unmet or slipping objective conditions rank first, and a Court that didn't move them isn't repeated. Court orders report the relation change. | `ui/src/components/Desk.tsx` `useSuggestions`, `turn.ts` |
| 2 | The verdict hangs together. Archetypes come from `director.record` of the orders actually given. "Stay in power" is ✓ unless the player was deposed. The grade follows the outcome first and score vs par second (a win is ≥ C, a fail ≤ D, an early fail F). No more "13/12". The share text carries score, month, headline and link. | `scoring.ts`, `objectives.ts`, `EndScreen.tsx`, `Hud.tsx` |
| 3 | The player is the real leader by default. Flashpoints use the objective briefing as the backstory, and a typed name overrides the leader. | `data-loader.ts` |
| 4 | `ActionPreview.missionWarning`. The desk asks for confirmation, and the preview modal shows a red banner. | `preview.ts`, `Desk.tsx`, `ActionPreviewModal.tsx` |
| 5 | The desk's "capital left" includes the chosen or default crisis option's `pc`. | `Desk.tsx` |
| 6 | Growth shocks fade back to `trendGrowth` (10%/mo). Drags are measured against each country's baseline. Voters and elections use `growthMood`. Reparations cap at 4% of the winner's GDP. | `systems/economy.ts`, `military.ts`, `government.ts` |
| 7 | Reform has diminishing returns. Stability, legitimacy and approval decay near the top. A legitimate government recovers from about 0 stability. | `systems/stability.ts` |
| 8 | Consolidated democracies get no coups and almost no revolutions. A telegraphed impeachment / no-confidence card ends in `IMPEACHED`. | `government.ts`, `crises.ts` `ouster_vote` |
| 9 | Land-border geography and landlocked states. Refugees only come from real neighbours; incidents with landlocked states happen in the air, not at sea. Iran–Saudi relations start at −15. | `src/core/geography.ts`, `crises.ts`, `events.ts` |
| 10 | Covert orders report Success or Failed and whether they were exposed. A successful assassination or coup gets a moment stamp. | `turn.ts`, `systems/covert.ts` |
| 11 | `/turn` returns only the player's resolved and rejected actions. The same crisis can no longer appear twice on one desk. | `api/routes/game.ts`, `crises.ts` |

Tests for all of these are in `tests/core/handoff.spec.ts`.

## Measured balance (12 games per seat)

- **Term** (USA, UKR, ISR, TWN, DEU):
  - Smart: 83–100%, 95% pooled.
  - None: 0%.
  - Random: 8–100%, 47% pooled. TWN is the outlier at 100%; it was 58% at baseline.
  - Tension: median 65–74; months ≥80 run 9–29% (none/random runs are the high end).
- **Flashpoints** (all 22 seats):
  - Smart: 75–100%.
  - None: ≤ 8%.
  - Random: 0–42%.
  - Tension: medians 72–85. This is unchanged from before this round and still above the 45–70 target.

## Next work, in order

### P0
1. **Persona playtest round 3** on this build (the same four personas, phone and desktop). Check whether advisors now save Maya's Taiwan run, Leo's warning flow and Dan's long-game economy.

### P1
2. **Term too easy for Taiwan and Germany.** Random play wins 100% (TWN) and 75% (DEU), and smart play is at the top of its band. Candidates: election-year crises for TWN, opposition-controlled legislature effects, and approval effects of crisis options.
3. **Flashpoint tension runs hot** (medians 72–85). Tune each flashpoint's `globalTension` and escalation in `data/flashpoints`.
4. **Phone/HUD polish** (review §5 #9): pip overflow, a layout-aware tip, a sticky chosen option and Execute button, and a width for the tension bar.
5. **Share card image** (review §5 #10): put the score and headline on the PNG and colour the strip by objective progress. The text version is already done.
6. **Iran Term is close to scripted death** (it collapses around month 8 even when reforming every month). Revisit the start state (two wars, −5% growth) or give it a recovery path.

### P2
7. Name mash-ups ("Benazir Sharif"), "A Ethiopia" / "United States's", the Legacy Pakistan election date, and the scripted NK-missiles event firing when the player is North Korea.
8. A nuclear escalation path that chaos players can use without an existing war (review: Leo).

## How to verify
```bash
npm install && (cd ui && npm install) && npx prisma generate && npx prisma db push
npm test && npm run lint && (cd ui && npm run lint) && npm run build
npm run sim -- --scenario 2026 --mode TERM --countries USA,UKR,ISR,TWN,DEU --games 12 --policy smart,none,random
for each flashpoint: npm run sim -- --flashpoint <id> --scenario 2026 --countries <seats> --games 12 --policy smart,none,random --why 1
```
Note: a fresh clone needs `npx prisma generate` before `npm test`, or `drama.spec.ts` fails with "Cannot find module '.prisma/client/default'".

Balance targets: smart 70–95%, none ≤20%, random 15–45%. Tension median 45–70, with ≤20% of months ≥80.

Commit conventional messages to `feat/engagement-overhaul` and push; never touch `main`. Update `dev_plan/project_status.html` (STATUS object: tasks, timeline, decisions) after each milestone.
