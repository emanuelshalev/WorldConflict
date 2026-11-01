# Handoff — engagement overhaul (branch `feat/engagement-overhaul`)

State as of 2026-11-01: engine overhaul, 41-country 2026 world, 8 balanced flashpoints, new UI, AI tiers, docs — all committed. Tests 70/70, backend + UI lint clean, `npm run build` passes. Plan, tasks, blockers and decisions: `dev_plan/project_status.html`. Reviews: `dev_plan/reviews/` (round 2 = `player-personas-round2.md`, read it first).

Round-2 persona ratings (round 1 → 2): Maya recommend 2→7, Priya 5→7, Dan 4→5, Leo 4→5. Visual 3–5 → 7–8.

## Next work (from round 2), in order

### P0
1. **Advisor suggestions must read the mission** (`ui/src/components/Desk.tsx` `useSuggestions`): prioritise orders that protect objective conditions (RELATION_MIN targets slipping → court them; STAT_MIN at risk → reform/address; WAR_ENDED → mediate). Mirror the objective-aware logic in `scripts/simulate.ts` `smartOrders`.
2. **End-screen verdict coherence** (`src/core/scoring.ts` `classifyLeadership`, `src/core/objectives.ts` `computeOutcome`, `ui/src/components/EndScreen.tsx`):
   - archetype must reflect play (wars declared are not detected — timeline text is `WAR: X attacks Y`, not "declared war");
   - "Stay in power" must be ✓ when the session ended by OBJECTIVE_FAILED while still in office (only depositions/collapse/holocaust are ✗);
   - grade should derive from outcome + score vs par (a won Term must not be D; a month-2 failure must not be C).
3. **Real leader option**: let the player play as the scenario's real leader (e.g. Zelensky) or a custom name; backstory must not contradict the flashpoint brief (`src/core/data-loader.ts` createCountryState/`generatePlayerBackstory`; for flashpoints use the objective briefing as the backstory).
4. **Flashpoint war declaration**: warn in the preview when an order would fail the mission (e.g. NO_WAR_WITH); `src/core/preview.ts` should check `world.objective` conditions.
5. **PC accounting in the desk** must include crisis-option `pc` costs before Execute (`Desk.tsx` pcLeft) so orders aren't rejected after pressing Execute.

### P1
6. Economy: reparations exploding a small GDP (PRK $21B→$288B) — cap transfers in `systems/military.ts` endWar; peacetime GDP drifts down over a Term and the economic score collapses — check `systems/economy.ts` growth and `scoring.ts targetEconomic`.
7. Stats saturating at 99–100 (Turkey) / pinned at 0 (Iran) — soften extremes in `systems/stability.ts`.
8. Revolution toppling the USA — require insurgency + very low legitimacy for consolidated democracies.
9. Geography: landlocked navies ("Ethiopian warship") and refugee flows from non-neighbours — use `areNeighbors`/capitals in `crises.ts` and a `landlocked` flag.
10. Failed covert ops (e.g. assassination) report "✓ Carried out" — propagate covert outcome success into the turn report (`turn.ts` applyAction INTEL_* returns).
11. `/turn` response leaks all AI countries' resolved/rejected actions — return only the player's (`src/api/routes/game.ts`).

## How to verify
```bash
npm install && (cd ui && npm install) && npx prisma db push
npm test && npm run lint && (cd ui && npm run lint) && npm run build
npm run sim -- --scenario 2026 --mode TERM --countries USA,UKR,ISR,TWN,DEU --games 12 --policy smart,none,random
for each flashpoint: npm run sim -- --flashpoint <id> --scenario 2026 --countries <seats> --policy smart,none,random --why 1
```
Balance targets: smart 70–95%, none ≤20%, random 15–45%; tension median 45–70 with ≤20% of months ≥80.

Commit conventional messages to `feat/engagement-overhaul` and push; never touch `main`. Update `dev_plan/project_status.html` (STATUS object: tasks, timeline, decisions) after each milestone.
