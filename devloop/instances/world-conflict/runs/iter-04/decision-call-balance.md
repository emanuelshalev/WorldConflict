# Decision: the call balance band and the Quarantine China objective (D-84 revision)

Owner: Game Designer (Fable 5.2, per D-83). Status: proposal for the Group Manager, 2026-11-23; no code was changed. Read from git objects at `origin/build-your-call` (ec13051) only. Nothing was run: every number is either the builder's recorded figure (`tests/balance/exemptions.json`, the resume note) or arithmetic or reasoning, and is marked as such.

## 1. The decision in short

1. **India is a defect, not a balance seat, and it is not half of the gap.** The Guide me line tells India's player to "Strike the camps", which loses the mission in month 1. Fix the classification; do not exempt the seat.
2. **Fixing India makes the measured gap bigger, about 16.5 points (arithmetic).** India is the one seat where calm beats mission, so it hides the gap instead of causing it.
3. **Replace the symmetric 8-point band with three directional bands.** The symmetric band came from an emulation in which the crisis answer was worth nothing. The new bands fail today on India, so this is not a loosening.
4. **Quarantine China gets one primary goal: "Taipei comes to the table" (relations with Taiwan -55 or more).** Waiting ends near -71 by estimate, so it requires a move.
5. **One `npm run bench:reveal` at the end covers everything.** It is already owed on the branch.

## 2. Findings

### 2.1 Water-war India (verified in code and data)

- The opening crisis `in_jammu` has three answers. "Strike the camps" and "Hit their air bases" carry `MILITARY_AIRSTRIKE` on PAK; "Covert action and a dossier" is the default.
- Pakistan is `ARMED` (`data/countries/PAK.json`). A peacetime airstrike on a TESTED+ power calls `actOfWar` (`src/core/turn.ts`, about lines 808 and 1099): Pakistan declares war.
- India's first primary goal is `NO_WAR_WITH PAK`, which then fails for good (`objectives.ts`).
- `conditionEffect` in `src/core/missionImpact.ts` rates that airstrike as "hurts" (-4), not "breaks" (-20).
- All three answers hurt some goal, so `crisisCall` uses the whole pool. "Strike the camps" scores -5 with a bonus help, "Covert" scores -5 with a bonus hurt, so the strike becomes the mission card.
- Result: `callpush` and the Chief of Staff pick take the strike and lose; `callhold` takes Covert. This matches the recorded callhold 100%, callpush 6%.
- `smart` picks the strike too (`optionValue` in `scripts/policies.ts` has no act-of-war penalty), which matches the recorded smart 0%.
- The D84-ADVISERS guard does not catch it: it only asserts when a safe card exists.

By reasoning, not recorded: `guided` uses the same Chief of Staff pick, so guided India should also be near 6%.

### 2.2 The pooled gap (arithmetic on the recorded 36-game numbers)

| | callpush | callhold | push minus hold |
|---|---|---|---|
| Recorded, 21 seats | 83.2% | 71.2% | 12.0 |
| India alone | 6% | 100% | -94 |
| Other 20 seats | 87.1% | 69.8% | 17.3 |
| After the India fix, both policies equal on India | about 87.7% | 71.2% | about 16.5 |

The exemption note ("half of it is water-war India") has the sign wrong. The builder should confirm with the per-seat table from `.scratch/seats.mjs`; that output was not committed.

Callhold's India games should not change with the fix: its picks stay Covert, flush, Absorb (trace of the first three crises).

### 2.3 Why the real gap differs from the emulated 0.8 (judgment, from code)

- The emulated "hold" took the best answer for the country among answers that hurt no goal. The built calm card prefers an answer that helps no goal, and when no answer is safe it can be one that hurts more than the mission card.
- The price only bites when the bank is short. Guided sits at the cap in 33% of months, so the mission card is often free in effect.
- Emulation row 8 (never the mission answer: 88.9% against 91.3%) showed parity because the crisis answer barely mattered. That was the iteration 3 defect, not a target.

## 3. What the band is for, and whether this direction is bad

The band guards two different experiences:

- **Calm beats mission (bad, blocks):** the Guide me line and the priced card are a trap. Newcomers follow the line and lose. This is India today.
- **Mission beats calm (expected up to a point):** the mission card is by definition the one that helps the goals, and wins measure goals. It only becomes bad when calm is a losing card, or when "always the mission card" beats what we allow guided play.

The symmetric band also contradicts two other D-84 bands. Guided must win 65 to 90% and callpush is almost the same policy (83.2 against 82). For a gap of 8, "ignore the mission in every crisis" would have to win 75% or more, above `smart` (74%). The Game Designer wrote that band and withdraws it.

## 4. Options

| Option | Trade-off | Verdict |
|---|---|---|
| A. Tune until push and hold are within 8 | Needs a stronger calm card or price 2. Price 2 was rejected (smart 73.8%, at the floor). A calm card that also helps goals removes the trade. No nameable lever closes 16 points without measurement. | Reject |
| B. Exempt India | The pooled number gets worse without India, and the seat misleads players. Iran's Term is exempt because it is hard by design; India is wrong by classification. | Reject, except as the fallback in 6.5 |
| C. Fix India's classification | Small, player-facing, deterministic. Does not close the pooled gap. | Adopt |
| D. Directional bands | Keeps the 8 where it protects players, adds a per-seat check that fails today, bounds the other side by floors we already use. | Adopt |
| E. Leave the exemption as is | Ships a Guide me line that loses a flashpoint in month 1. | Reject |

## 5. Recommendation and exact changes

### 5.1 India: honest classification (C)

1. `src/core/missionImpact.ts`, `conditionEffect`, case `NO_WAR_WITH`: a `MILITARY_AIRSTRIKE` on the target returns "breaks" when the target is nuclear operational (`isNuclearOperational`, `systems/nuclear.ts`) and the player is not at war with it; otherwise "hurts" as today.
2. `src/core/advisors.ts`, `crisisCall`: the pool is the safe answers; if none, the answers that break no primary goal; if none, all. No adviser backs a goal-breaking card when another exists (D-72 extended).
3. `src/core/preview.ts`, `missionWarning`: for that same case say the war is certain, not "may answer with war". Text only.
4. Recommended, separable: `scripts/policies.ts`, `decide`: give such an answer the same -20 as a declaration of war. Smart India should leave 0% and pooled smart should gain up to about 4 points (reasoned).

Expected on India (reasoned): month 1 becomes "Your advisers agree on Covert action and a dossier. The others cost you: No full-scale war with Pakistan." The strike cards stay choosable and show "breaks". No capability or seat is removed.

Not in this iteration: India's fantasy ("impose a visible cost") is unplayable while any strike is full war. Rewriting the strike answers as effects without an airstrike action is content work for iteration 5.

### 5.2 Bands (D), in `tests/balance/bands.spec.ts`, replacing `call-gap`

| Check id | Rule | Today | Blocking |
|---|---|---|---|
| `call-trap` | callhold minus callpush at most 8 pooled | -12, passes | yes |
| `call-trap-seat` | on no seat callhold beats callpush by more than 25 (36 games) | India 94, fails | yes |
| `calm-floor` | callhold pooled at least 65% (guided's floor) | 71.2% | yes |
| `push-ceiling` | callpush pooled at most 90% (guided's ceiling) | 83.2%, about 87.7% after 5.1 | yes |
| `call-gap` | callpush minus callhold, target 15 or less | about 16.5 after 5.1 | informative in iteration 4, reviewed in 5 |

- Remove the `call-gap` entry from `tests/balance/exemptions.json`.
- `quality.json` `call-balance` reads `call-trap`, threshold 8. The adapter regex in `quality-adapters.mjs` follows the new log line.
- Iteration 5, not now: a state-aware policy (mission card when its goal is behind, calm otherwise) that must match callpush on wins and beat it on stars. That is the true test of "no fixed rule wins".

### 5.3 Quarantine China objective

In `data/flashpoints/quarantine.json`, `objectives.CHN.primary`, before the `SCORE_PAR` entry:

```json
{
  "kind": "RELATION_MIN",
  "targetId": "TWN",
  "min": -55,
  "label": "Taipei comes to the table (relations -55+)",
  "short": "Bring Taipei to the table"
}
```

It uses the existing `ObjectiveConditionSchema`, with no new kind. It matches the briefing ("make Taipei accept the inspections or come to the table").

Why it requires a move (verified mechanics, estimated outcome):

- Setup is CHN to TWN -80. Drift pulls 2% a month toward -12 (Taiwan is not in China's `historicalRivals`; communist against democracy gives -12). Twelve months of waiting gives about -65.
- The skipped month-11 crisis defaults to "Inspections first" (-6), so waiting ends near -71. That is 16 short.
- `computeSuggestions` proposes courting a primary `RELATION_MIN` target every month while it is under need plus 10. That is a mission order, so it lands in the mission move, never in Accept all.
- `improveRelations` gives +7 at this level for 1 capital, with no chance roll. About four moves reach the goal.
- Two crises become priced calls: "Announce a pause for talks" (+10) at month 8 and "Accept the talks" (+12) at month 11.

Expected (reasoned, not measured):

- **Skip everything:** from 89 to 92% down to under 20%.
- **Smart:** `smartOrders` already courts a mission relation under need plus 10, so it should lose a few points at most (1 capital in about five months).
- **Pooled bands:** staff falls by about 3.5 points; guided is roughly flat.

Remove the `staff-seat` exemption for `FLASHPOINT:quarantine:CHN` once measured.

## 6. Verification for the builder

### 6.1 Order of work

India fix, then bands, then the China objective, then one benchmark run.

### 6.2 Harness commands

- All seats: `node .scratch/seats.mjs . 36 staff,guided,callpush,callhold,smart,none`, with the per-seat table saved under `runs/iter-04/`.
- India: `npm run sim -- --flashpoint water-war --scenario 2026 --countries IND,PAK --games 36 --policy guided,callpush,callhold,smart,staff --why 1`
- China: `npm run sim -- --flashpoint quarantine --scenario 2026 --countries CHN,TWN,USA --games 36 --policy staff,none,guided,callpush,callhold,smart --why 1`
- Then `npx vitest run -c vitest.balance.config.ts` with `BALANCE_GAMES=36`, `npx vitest run tests/core/determinism.spec.ts tests/core/your-call.spec.ts tests/core/wild-moves.spec.ts`, `npm run bench:reveal`, and `npm run verify`.

### 6.3 Pass criteria

- **India:** callhold beats callpush by 25 or less; guided at least 65%.
- **China:** staff at most 60% (target under 30%), none at most 20%, smart at least 65%, guided at least 65%.
- **Pooled:** smart 70 to 95%, guided 65 to 90%, staff at most 30%, cap months at most 45%, and the four blocking bands in 5.2.

### 6.4 Guards to add in `tests/core/your-call.spec.ts`

- `D84-ACTOFWAR`: an answer with a peacetime airstrike on a TESTED+ power is "breaks" on `NO_WAR_WITH`; no backed card breaks a primary goal when another card breaks none; on water-war India month 1 neither the guide line nor the Chief of Staff pick is a strike.
- `D84-CALL-TRAP`: the band checks in 5.2.
- `D84-QU-CHN`: on QU-CHN-LEO01, staff does not win and guided does; the Taiwan court appears in the mission move and never in the upkeep orders.

### 6.5 Stop conditions (two attempts each)

- **India.** Attempt 1 is 5.1. If the seat still splits by more than 25, attempt 2 is: the calm card may not hurt a primary goal the mission card spares. If it still fails: add an exemption for `call-trap-seat` on `FLASHPOINT:water-war:IND` (measured and printed, like Iran's Term), log a ledger line, and schedule the content rewrite for iteration 5. Stop tuning.
- **China.** Attempt 1 is -55. Attempt 2 sets the threshold from the measured end values: 5 above the staff 90th percentile, never above -45; if smart is under 65%, go to -60. If no value gives staff at most 60% and smart at least 65%: keep the existing exemption, revert the data, and report back to the Game Designer.
- **Push ceiling or guided over 90% after the India fix.** Do not tune in the build. Send the per-seat table to the Game Designer.

## 7. Risks

- **Benchmarks.** The China objective changes the fingerprint (flashpoint primaries are hashed). The branch is already stale: `src/core/costs.ts` is in the fingerprint, it changed, and the diff holds no `data/benchmarks/` change. One `npm run bench:reveal` at the end, about 15 minutes, never hand-merged. The optional smart fix changes benchmark results but not the fingerprint, so it must land before that run.
- **Guided and callpush move toward 90%** once India stops losing (about 86.5% and 87.7% if India goes to 100%). Use 36 games.
- **Fewer real decisions on India month 1** (advisers agree). The 1.0 a month metric is measured on control seeds, and none is India, so the gate does not move. The play pass should still look at it.
- **QU-CHN-LEO01 is a control seed.** A fifth goal chip changes that seed's screens, so visual baselines may need `npm run verify -- --update-visual`. `tests/ui-glossary.spec.ts` checks the new label.
- **Determinism and replay.** All changes are pure classification, data and harness. No RNG, no new input in `world.inputs`.
- **Types.** No schema change, so `ui/src/store/gameStore.ts` needs nothing.

## 8. What could not be verified

- Any post-change win rate. The harness could not run on that branch during the analysis.
- Per-seat results other than India and Quarantine China: which seats carry the 17-point gap on the other 20 is unknown.
- Guided on India today (inferred from the shared Chief of Staff pick).
- What Taiwan's AI does to the China relation over 12 months. The -71 counts only drift and the scripted default.
- Whether the recorded smart 74% is pooled over all 21 flashpoint seats.
- Whether `docs/GAMEPLAY.md` lists flashpoint goals that would need the new line.

## 9. Proposed ledger line

D-84 revision: the call balance band becomes directional (calm never beats mission by more than 8 pooled or 25 on a seat; callhold at least 65%; callpush at most 90%; push minus hold informative, target 15). A peacetime airstrike on a nuclear power is classified as breaking a no-war goal and no adviser backs a goal-breaking card. Quarantine China gains the primary goal "Taipei comes to the table (relations -55+)". Evidence: India callpush 6% against callhold 100%, the other 20 seats 87.1% against 69.8%. Rejected: exempting India, price 2. Reversal trigger: callhold under 65%, or smart on Quarantine China under 65% after two attempts.
