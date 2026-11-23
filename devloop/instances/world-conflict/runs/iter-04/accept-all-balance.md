# Accept all as a winning strategy: a balance call for the Game Designer

Build engineer, iteration 4 stability package (D-76, WP4-8). Items QA3R-4a (Accept all wins most flashpoints) and QA3R-4b (capital ends the month at the cap) from `runs/iter-03/qa-repro.md`. No balance was changed for them: this note gives the numbers and the options. The stability package did change things that move these numbers (court floor and repeats, crisis fit, ceasefire refusals); they are measured after those changes.

## Numbers

Control seeds (`scenarios/scenarios.yaml` `control:`, the seven flashpoint seats, 12 months, deterministic; `tests/fixtures/control.ts`):

| Policy | Iteration 3 repro | After iteration 4 fixes | Mean Presidency Score (after) |
|---|---|---|---|
| `staff` (Accept all recommended) | 5 of 7 | 6 of 7 (only HC-ARE-NOAH1 loses) | 652 |
| `staffswitch` (Accept all, mission picks) | 7 of 7 | 7 of 7 | 668 |
| `picks` (crisis and meeting picks, no orders) | 3 of 7 | 3 of 7 | 552 |
| `none` | 0 of 7 | 0 of 7 | 366 |

Customers who played themselves on the same seeds scored 470 (Maya), 562 (Leo) and 746 (Olivia): Accept all beats two of three.

Harness, all 21 flashpoint seats, 12 games each (`npm run sim -- --flashpoint <id> --mode FLASHPOINT --countries ... --games 12 --policy staff,staffswitch,smart`):

| Policy | Pooled wins | Mean stars | Seats at 65%+ |
|---|---|---|---|
| `staff` | 74% | 1.79 | 14 of 21 |
| `staffswitch` | 87% | 2.19 | 18 of 21 |
| `smart` (the designed competent player) | 79% | 1.92 | 16 of 21 |

So Accept all with the mission picks plays better than the harness's competent player, and plain Accept all is about as good. D-49 accepted a staff band of 78% "for now".

Capital (QA3R-4b): with the staff orders accepted, capital ends the month at the cap (6) in 57 of 84 control-seed months; with crisis picks only, in 84 of 84. The staff propose at most 2 cheap orders and keep a reserve (`STAFF_ORDERS = 2`, `RESERVE_PC = 1` in `src/core/advisors.ts`, mirrored in `ui/src/lib/month.ts`).

Ceasefire repetition fix (QA3R-3h), the Ukraine ceasefire seats, 36 games each, before and after:

| Seat | smart | staff | staffswitch | random | none |
|---|---|---|---|---|---|
| UKR | 100% to 94% | 100% to 100% | 100% to 100% | 0% to 0% | 0% to 0% |
| RUS | 94% to 81% | 100% to 94% | 100% to 97% | 8% to 3% | 0% to 0% |
| USA | 75% to 78% | 19% to 22% | 86% to 83% | 6% to 0% | 0% to 0% |

Tension median moved 1 to 3 points up (53 to 65), inside the 45 to 70 target. The reduced balance band suite (`vitest.balance.config.ts`) passes.

## Options

1. **Keep Accept all strong, show its cost (no balance change).** Treat Accept all as the newcomer path (it is the Guide me promise: "your staff can carry you"). Set the harness band to what it is now (staff 65 to 85% pooled, staffswitch no band) and spend the effort on making the player's own moves score higher than Accept all: a Presidency Score bonus for orders the staff did not propose, or seals that Accept all cannot earn. Risk: Dan's D2 ("one move that always wins") stays true for winning, only the score separates.
2. **Make the cabinet pick worse for the mission, keep mission picks good.** Accept all takes the cabinet pick, which is close to the mission pick today. Widen the gap (more cabinet picks that trade the mission for approval or the economy, as D-46 intended) so `staff` falls to about 50 to 60% while `staffswitch` (the player who reads the mission tags) stays near 85%. Guard: `staff` at most 4 of 7 control seeds and at least 60 Presidency points below `staffswitch`. Risk: newcomers who press Accept all lose more; needs the mission tag to stay obvious (RS-005).
3. **Let the staff spend, but on the safe middle.** Answers QA3R-4b too: the staff propose up to the capital minus the reserve (3 or 4 orders when 6 is banked), but only safe, low-yield orders, while the high-yield moves (Big move, mediation, sabotage) stay the player's call. Win rate rises a little for `staff`; the score gap to a player who uses the Big move widens. Guard: Accept all leaves at most 3 capital unspent, and `smart` beats `staff` by at least 30 Presidency points pooled. Risk: Accept all gets stronger before it gets weaker; must ship with option 1 or 2.

Recommendation from the build side: 2 (it is the design intent of D-46 and the only one that makes Accept all a choice rather than the answer), with 3's capital rule if the Game Designer wants QA3R-4b closed in the same iteration. Either needs a new harness band in `tests/balance/bands.spec.ts` and the control-seed guard in `tests/core/advisors.spec.ts` once the band is decided.
