# Decision: Accept all recommended must stop playing the game (WP4-8, F-03-1, QA3R-4a, QA3R-4b)

Owner: Game Designer. Status: decided, ready for build with the agenda (WP4-6). Proposed ledger entry: D-84. Inputs: `runs/iter-03/triage.md` (F-03-1, all nine customers), `runs/iter-03/patterns.json`, `runs/iter-04/accept-all-balance.md` (build engineer, three options), `runs/iter-03/design-agenda.md` sections 0 and 0.12 (Choose, Recommended by, Skip with its cost), `runs/iter-04/design-layout.md` section 13, `goals.md` (G4, G5, G8), the release gate (agency and feels like a game at 7.0 or more), and the CEO rule: never remove a feature or capability.

No code was changed for this decision. The numbers in section 2 come from the real engine driven by a scratch script outside the repo (same seeds and loop as `scripts/simulate.ts`: 21 flashpoint seats, 12 games each, STATESMAN). The baseline rows reproduce the build engineer's table exactly (staff 74.2%, staffswitch 86.9%, smart 79.4%). Rows marked "emulated" apply a proposed rule from outside the engine (for example by lowering capital before the month resolves), so they are estimates the build must re-measure with real harness policies.

## 1. The decision in short

1. **Accept all recommended stays, and it covers the routine only.** Small meetings, recommended orders that keep the country running, and crises that do not touch the mission. It still finishes those in one press.
2. **Every month has "Your call":** the crisis when its answers differ for the mission, and the mission move (the orders that push a goal). Accept all never decides a call. On a call there is no single Recommended answer: two advisers recommend different cards by name, and the player chooses a side, or skips with the cost named.
3. **The mission side of a crisis costs political capital (1):** an answer that helps a goal costs 1 more when another answer of that crisis helps none. This makes the call a trade, and gives banked capital a use.
4. **Guide me keeps newcomers safe:** above the cards the Chief of Staff says which card serves the mission and which keeps the country calm. Following that line wins about as often as the competent player (86% emulated). Pressing only Accept all and Execute loses (11% emulated).
5. **The gate enforces it** with four harness bands and three play-pass criteria (section 6).

## 2. What the harness says (new findings)

All 21 flashpoint seats, 12 games each. "Mission order" means a staff order that helps a primary goal; "upkeep order" means one that helps none.

| # | Policy | Wins | Stars | Months at the capital cap | What it shows |
|---|---|---|---|---|---|
| 1 | `staff` today (cabinet picks, 2 staff orders) | 74.2% | 1.79 | 73% | Baseline, matches the build engineer |
| 2 | `staffswitch` today (mission picks) | 86.9% | 2.19 | 70% | Baseline |
| 3 | `smart` | 79.4% | 1.92 | 51% | Baseline |
| 4 | `none` / `random` | 0.4% / 9.1% | | | Random is under its band (known, D-49) |
| 5 | Crisis picks only, no orders (cabinet / mission) | 29.8% / 46.8% | | 100% | The orders win the game, not the picks |
| 6 | D-72 rule alone: recommended answer never hurts a goal, 2 staff orders | **91.3%** | 2.17 | 70% | Shipping D-72 without this decision makes Accept all stronger, not weaker |
| 7 | Row 6 with upkeep orders only (no mission orders) | 59.5% | 1.32 | 93% | Mission orders are worth 32 points, yet only 0.46 a month are proposed |
| 8 | Never the mission answer in a crisis, but all staff orders | 88.9% | 2.10 | 69% | The mission answer in a crisis is worth almost nothing today |
| 9 | Never the mission answer, upkeep orders only | 50.8% | 1.15 | 93% | "Hold everything safely" still wins half the seats |
| 10 | **Mission crises left unanswered** (engine default), others answered safely, upkeep orders only | **10.7%** | 0.25 | 95% | Accept all under this decision, call skipped every month |
| 11 | Mission answer costs 1 more (emulated), always taken | 84.9% | 2.12 | 54% | The price is balance neutral and capital comes off the cap |
| 12 | Same price, never taken (hold, all orders) | 85.7% | 2.03 | 58% | Neither side of the call wins by itself: 84.9 against 85.7 |
| 13 | Same price, taken every other time | 84.9% | 2.12 | 54% | Same |
| 14 | `smart` with the price | 81.0% | 1.91 | 39% | The smart band holds |
| 15 | Mission answer costs 2 more | 80.2% (smart 73.8%) | | 41% | Too close to the smart floor on single seats |
| 16 | Capital income 2 instead of 3 (emulated) | staffswitch 84.5%, smart 75.0% | | 4% | Lower income fixes the cap and nothing else |
| 17 | Income 2 and price 2 | staffswitch 67.5%, smart 61.1% | | 1% | Breaks the smart band (70% floor) |
| 18 | Guided emulation: safe answer on routine crises, mission side on true splits, all staff orders | 86.1% | 2.18 | 70% | The newcomer who follows the Chief of Staff line |

Control seeds (the seven flashpoint seeds): today `staff` 6 of 7 and `staffswitch` 7 of 7; row 7 still wins 6 of 7 and row 9 wins 5 of 7; row 10 wins 2 of 7 (SL-CHN-SAM01 and QU-CHN-LEO01); `smart` 7 of 7.

How often there is something to call (from the `staff` run, 2976 months, 3230 crises):

- 1.09 crises a month; 76% of crises have answers that differ for the mission; 78% of months hold such a crisis.
- In only 22% of crises does the best answer for the mission differ from the best answer for the country (a true split). In the rest one card is best at both, so the tag is an oracle.
- In 41% of crises one answer helps a goal and another helps none (these become trades once the mission side has a price).
- 50% of months offer at least one mission order, 24% offer two or more; a mission order costs 1.23 capital on average.
- A call exists (mission crisis or mission order) in 86% of months, and in 83% of months 4 to 12.
- Capital: 5.35 in the bank at the start of an average month, against about 1.8 spent. There is more capital than things worth buying.

Term (2026: USA, UKR, DEU, ISR, TWN, 6 games each, 30 games, so read as a direction only): `staff` 67%, `staffswitch` 70%, `smart` 97%, row 9 73%, row 10 3%. Term already separates the competent player from Accept all on wins (30 points) and stars (2.43 against 1.50); its problem is fewer events (0.54 crises a month, a mission crisis in 19% of months).

What this changes in the analysis:

- **The gap between cabinet pick and mission pick is not the lever** (build engineer's option 2). It is 13 points, it contradicts D-72 (three customers distrusted an adviser who recommends a goal-hurting answer), and D-72 by itself lifts Accept all to 91%.
- **Capital pricing alone is not the lever.** Supply is 3 a month and demand about 1.8. Only a harsh setting bites, and it breaks the smart band.
- **The lever is what Accept all is allowed to decide.** The wins come from two things the staff decide for the player today: not walking into a goal-hurting or default crisis answer (rows 9 and 10: 51% against 11%), and the mission orders (rows 6 and 7: 91% against 60%). Those two are the game. They must be the player's.

## 3. Options

### A. Advisers who disagree (two recommendations, the player picks a side)

- **Player sees and feels:** on the month's main thing, two cards carry "Recommended by your Defense Minister" and "Recommended by your Foreign Minister", each with a reason and its effects on the goals in words. No star says which is right. "My cabinet is split and I am the one who decides."
- **Why it creates a decision:** Accept all cannot resolve a split, so the item is left to the player. It is a real trade only when neither card is better at everything, which today is true in 22% of crises.
- **Newcomer risk:** medium. Ruth, Noah and Olivia need a hint. Solved by a Chief of Staff line at Guide me that says which aim each card serves.
- **Measure:** `staff` (Accept all, calls skipped) at 30% or less; share of months with a call; play pass: real decisions per month.
- **Build size:** M (advice payload, agenda cards, wording; no engine change).
- **Verdict:** adopt as the frame. Not enough alone: it needs option D for the trade to be real.

### B. Recommendations that are good but not mission-optimal, with the mission pick visible (build engineer's option 2)

- **Player sees and feels:** the Recommended card is the cabinet's comfortable answer; another card carries "Best for your mission". "My staff play it safe; I have to push."
- **Why it creates a decision:** Accept all takes the comfortable answer, so the mission needs the player.
- **Newcomer risk:** high for trust. D-72 exists because three customers distrusted an adviser recommending an answer that hurts a goal. And the player who follows every mission tag wins 87%: the autopilot moves from one button to one tag (Dan's "one move that always wins").
- **Measure:** `staff` 50 to 60%, `staffswitch` near 85% (the build engineer's guard).
- **Build size:** S.
- **Verdict:** reject as the main lever. Evidence rows 5, 6 and 8: the pick gap is small, and the honest version of the recommendation (D-72) is the strongest Accept all of all. Keep the part that is right: the mission side is always visible as a choice.

### C. Show the cost of accepting blindly (build engineer's option 1)

- **Player sees and feels:** "If you execute now" names what is left open and what it costs; the result card and the reveal say how many calls were made and skipped; unspent capital above the cap is shown as lost.
- **Why it creates a decision:** it does not create one; it makes an existing one visible.
- **Newcomer risk:** low.
- **Measure:** play pass: every skipped call names its cost before Execute and in the report.
- **Build size:** S.
- **Verdict:** adopt as part of the package. Alone it leaves Accept all winning 6 of 7.

### D. Crises whose best answer depends on the player's own goals (a price on the mission side)

- **Player sees and feels:** the card that pushes a goal shows "Costs political capital 1" next to "Helps: Keep the Strait open"; the calm card is free. The goal line says whether that goal is on track. "Do I need this now, and can I afford it?"
- **Why it creates a decision:** the right answer depends on the state: goal behind or on track, capital in the bank, months left. Rows 11 to 13: always paying, never paying and alternating all land within one point, so no fixed rule wins and the choice turns on the situation.
- **Newcomer risk:** low to medium. A newcomer at 0 capital cannot take the mission side; the card must show that before the press with the reason and the fix (G1).
- **Measure:** the two fixed rules (always the mission side, never the mission side) within 8 points of each other; `smart` stays in band.
- **Build size:** S for the engine rule, plus regenerating the benchmarks (costs are in the fingerprint).
- **Verdict:** adopt at price 1. Price 2 is rejected (row 15).

### E. The capital economy (cap 6, income 2 to 3)

- **Player sees and feels:** with income 2 in a Flashpoint, the bank is never full.
- **Why it creates a decision:** in theory scarcity; in practice there is too little to buy, so it changes the cap statistic and little else (row 16).
- **Newcomer risk:** high. A tight bank blocks the player's own orders, which is the opposite of G1 and of quick sessions.
- **Measure:** months at the cap.
- **Build size:** S, but a full rebalance of every seat if it bites (row 17).
- **Verdict:** reject changing income or the cap. Close QA3R-4b from the demand side: the price in D, three upkeep orders instead of two, and the mission move (see F). Build engineer's option 3 (staff spend more on the safe middle) is adopted in that form.

### F. The mission move is the player's (taking mission orders out of Accept all)

- **Player sees and feels:** one thing a month called "Your call: the move for your mission". Each adviser's proposal is a card ("Recommended by your Foreign Minister: Mediate between Sudan and Egypt, capital 2, 55% chance, helps End the war"), plus "Hold this month". "This month's initiative is mine."
- **Why it creates a decision:** the orders that win the game (32 points, row 7) are no longer queued by a bulk button. When two are on offer and the bank cannot pay both plus the crisis, the player chooses.
- **Newcomer risk:** low: it is the same Choose card as everywhere, and it is the "one clear your move" of the charter.
- **Measure:** `staff` band; months at the cap for the guided player.
- **Build size:** S to M (advice split, one agenda thing).
- **Verdict:** adopt.

## 4. Recommendation: "Your call" (A + C + D + F, with E's demand-side fix)

### 4.1 Rules for the build (exact)

**R1. What is a call.** A thing on the month's agenda is "your call" when one of these holds:

- (a) a crisis whose answers differ for the mission (`missionNote` is not null);
- (b) the mission move: the advisers propose at least one order that helps a primary goal (in Term and Legacy: a primary or a bonus goal). All such proposals form one thing, one card per proposal, plus the card "Hold this month";
- (c) a leader's call or visit whose answers differ for the mission (`deskImpact`).

Everything else is routine: other crises, small meetings, upkeep orders. Order on the agenda: the crisis first, then the mission move, then routine. No cap on calls; the play pass checks that no month has more than 3.

**R2. Accept all recommended decides routine things only.** Button: "Accept all recommended (n)", n counts routine things only. Line under it: "Chooses the recommended answer for n routine things. k stay open: your call." In Map mode "Review n recommended" as designed. It never chooses a card on a call and never queues a mission order. The capability stays: one press still clears every routine thing, and the month can still be executed after it.

**R3. The recommended answer on routine things** follows D-72: best for the country (`netScore`) among answers that hurt no goal. This replaces the majority rule in `cabinetPick` at every difficulty. It is safe to ship only together with R2 (row 6).

**R4. Advisers disagree on a call, by name.** No card on a call carries the single Recommended star. Every card backed by an adviser shows "Recommended by your <adviser>: <reason>" (crisis: `backedBy`; mission move: the suggestion's `who`). At least two cards on a call name different advisers; when the data names fewer, the Chief of Staff backs the calm answer (best for the country among answers that hurt no goal and help none) and the minister of the goal's domain backs the mission answer. No adviser ever backs an answer that hurts a goal when the crisis has one that does not (D-72, kept per adviser). Every card shows its effect on the goals in words (`missionImpact`) and its cost.

**R5. Guide me line.** At Guide me, above the cards, one sentence from the Chief of Staff: "For your mission: <mission answer>. To keep things calm: <calm answer>." When both are the same card: "Your advisers agree on <answer>. The others cost you: <goal>." At Some help and I know this the sentence is not shown; the facts on the cards are. The existing mission note text stays on its card at every level as a fact, never as a button.

**R6. The price of the mission side.** In a crisis, an answer that helps at least one primary goal costs 1 political capital more than written, when another answer of the same crisis helps none (`PUSH_PC = 1` in `src/core/costs.ts`, applied where the decision resolves; shown on the card as part of its cost). If the bank cannot pay, the card is shown as unavailable before the press with the reason and the fix ("Costs political capital 1, you have 0. Skip an order to free it."). No change to income (3 in a Flashpoint, 2 otherwise, +1 on ANALYST) or the cap (6). Meetings and Term crises follow the same rule.

**R7. Skip on a call, with its cost.** The Skip card stays the last card (D-72, D5). On a crisis call it reads "Skip: the cabinet waits. <default answer in words>. <its cost for the goals in words>." and applies the engine default (what happens today when a crisis is not answered). On the mission move it reads "Hold this month. No move for your mission. Political capital n stays (above 6 is lost)." On routine things Skip keeps the meaning in design-agenda section 5. This changes one line of that section: on a call, Skip is no longer "the cabinet goes with its recommendation", because the cabinet is split.

**R8. Execute with an open call is allowed, and says so.** "If you execute now" lists each open call with the Skip consequence from R7, in the Plan, the Map float and the phone review. Execute is never disabled. At Guide me in months 1 to 3 the open call is lit with `pointAt` and the line "You have not made your call." sits above Execute.

**R9. Upkeep and the bank (QA3R-4b).** The staff propose up to 3 upkeep orders a month (`STAFF_ORDERS` 2 to 3), never a mission order, and leave a reserve equal to the dearest card of an open call, at least 1 and at most 3 (`RESERVE_PC` becomes that rule). Accept all takes them. Mission orders appear only in the mission move.

**R10. Missed calls are shown.** The result card and the month report carry one line per skipped call ("You skipped your call: the cabinet waited. Keep the Strait open fell behind."). The reveal's verdict stage adds "Calls you made: 9 of 11". No new seal in this iteration (seals are in the benchmark fingerprint; a "made every call" seal is a later option).

**R11. Words.** New glossary key `yourCall` ("Your call"); "Recommended" keeps its meaning for routine things; "Recommended by your <adviser>" on call cards; verbs stay Choose and Skip, and "Accept" stays only in "Accept all recommended". "Upkeep" and "routine" are internal words: the player reads "Recommended orders" and "small meetings".

### 4.2 Why this is a real decision each month

- The two things that decide a session (rows 5 to 10) are now pressed by the player: the mission crisis in 78% of months and the mission move in 50%; one or the other in 86%.
- With the price, the mission side and the calm side are balanced on wins (84.9% against 85.7%), so neither card is "the answer". Which one is right this month depends on the goal line and the bank, both on screen.
- Capital gets work to do without a tighter income: the price (about 0.45 a month), a third upkeep order, and the reserve for the call. Row 11 already moves the months at the cap from 70% to 54% before the third upkeep order.

### 4.3 Newcomers and experts

- **Newcomer (Guide me, quick session):** one or two calls a month, each a screen of two or three cards with a sentence that says which aim each serves; everything else in one press. Following the sentence wins about 86% (row 18), inside the smart band, so a first session is winnable without knowing geopolitics. Pressing only Accept all and Execute is still possible and still ends the month, and the screen says what it costs.
- **Expert (I know this, Everything view):** no hint sentence, the facts and two advisers arguing. The depth is in when to pay, which mission move to fund, and their own orders; stars and the Presidency Score separate good from winning.
- **Fairness:** nothing is hidden and nothing is random about the call: cost, chance and goal effect are on the card before the press (charter: a constraint is visible before it bites).

### 4.4 Risks and open points

- **The emulated numbers are estimates.** Rows 10 to 18 were produced outside the engine. The build re-measures with real policies (section 6) before the bands are switched on; if `guided` lands under 70%, lower nothing in the rules: first check the Guide me line picks (R5).
- **QU-CHN (Quarantine, China) wins 92% with every call skipped**, and it is control seed QU-CHN-LEO01. Its objectives are met by waiting. Give that seat one primary condition that needs a move (flashpoint data, then regenerate the benchmarks), until the seat is at 60% or less for `staff`.
- **Dominated cards remain in about a third of crises** (all answers help, or only one avoids harm). Reading the cards is still required there, which answers "crises answered unread", but it is a comprehension decision, not a trade. Criterion 6.2 c sets the floor; raising it further is content work on the crisis templates (iteration 5).
- **Term and Legacy have too few calls** (a mission crisis in 19% of months). R1 b counts bonus goals there, which was not measured. The Term band in 6.1 is informative until measured at 36 games.
- **CEO rule check.** Accept all recommended keeps its button, its count and its one-press behaviour; what changes is that a call is not a "recommended" thing, because two advisers recommend different answers. If the CEO reads this as narrowing a capability, the fallback is a setting "Let the Chief of Staff make my calls" (off by default, sessions played with it are marked in the reveal and the run history, and it uses the calm answer). It is not part of this build.
- **Random stays under its band** (9% against 15 to 45%); unchanged and still exempt (D-49).

## 5. Work packages (build size M in total, inside the agenda build)

| WP | What | Where | Size |
|---|---|---|---|
| C1 | `Advice.calls` (R1), routine pick by D-72 (R3), upkeep split, `STAFF_ORDERS` 3 and the reserve rule (R9), adviser pairs (R4) | `src/core/advisors.ts`, payload types in `ui/src/store/gameStore.ts` | M |
| C2 | Price of the mission side (R6), preview and unavailable reason on answer cards; regenerate `data/benchmarks/` | `src/core/costs.ts`, `turn.ts` (decision resolution), `availability.ts` | S |
| C3 | Agenda: call marker, cards with "Recommended by your <adviser>", Guide me line, Skip card texts, the mission move thing, Accept all count and line, "If you execute now" (R2, R4, R5, R7, R8) | `ui/src/lib/month.ts` `staffPickItems()`, `desk/StaffPicks`, `desk/YourMove`, agenda components of WP4-6, `lib/glossary.ts` | M |
| C4 | Report and reveal lines (R10) | `src/core/explain.ts`, `reveal.ts` (text only), `scenes/ResultCard.tsx` | S |
| C5 | Harness policies and bands (section 6), control-seed guard, registry entries for F-03-1, QA3R-4a, QA3R-4b | `scripts/policies.ts`, `tests/balance/bands.spec.ts`, `tests/core/advisors.spec.ts`, `tests/fixtures/control.ts`, `regressions.yaml` | S |
| C6 | QU-CHN objective; update design-agenda section 5 (Skip on a call) and the `staffswitch` description in CLAUDE.md | `data/flashpoints/quarantine.json`, docs | S |

Determinism and replay: the price is paid inside `executeTurn` from the recorded decision, so `world.inputs` needs no new field. The UI types are duplicated: `Advice.calls` must be added on both sides.

## 6. What the gate should enforce

### 6.1 Harness policies and bands (to add to `tests/balance/bands.spec.ts` and the CLAUDE.md balance targets)

Policies (in `scripts/policies.ts`):

- `staff`: Accept all recommended and Execute, every call skipped (R7 defaults). This is the new meaning of the existing name.
- `guided`: Accept all recommended, and on every call the card the Guide me line names for the mission; on the mission move the first proposal. Replaces `staffswitch`.
- `callpush`: as `guided`, always the mission side of a crisis. `callhold`: always the calm side, and every mission move. (The two fixed rules.)
- `smart`, `none`, `random`: unchanged.

| Band | Target | Measured or emulated now | Blocking |
|---|---|---|---|
| `staff` pooled, Flashpoints | 30% or less, and at least the `none` result | 10.7% (emulated, row 10) | yes |
| `staff` per seat | no seat above 60% | QU-CHN 92%, next TWN 33% | yes, after C6 |
| `staff` on the control seeds | at most 2 of 7 wins | 2 of 7 (emulated) | yes (guard in `tests/core/advisors.spec.ts`) |
| `guided` pooled | 65 to 90% | 86.1% (emulated, row 18) | yes |
| `guided` minus `smart` | at most 8 points | 6.7 without the price, 3.9 with it | informative in iteration 4, blocking from iteration 5 |
| `callpush` against `callhold` | within 8 points of each other, pooled | 84.9% against 85.7% (emulated) | yes |
| `smart` pooled, per seat | 70 to 95%, no seat below 65% | 79.4% (81.0% with the price); seats under 65% today are a known state, unchanged by this decision | unchanged |
| `none`, `random` | 20% or less per seat; 15 to 45% pooled | 0.4%; 9.1% (exempt, D-49) | unchanged |
| Capital at the cap, `guided` | 45% of months or less | 54% with the price, before the third upkeep order | yes |
| Capital at the cap, control seeds, `guided` | at most 30 of 84 months | 57 of 84 today (`staff`) | yes (QA3R-4b guard) |
| Term, `staff` pooled (USA, UKR, DEU, ISR, TWN) | 30% or less | 3% (emulated, 30 games) | informative until run at 36 games |
| Term, `smart` minus `guided` in mean stars | at least 0.4 | 0.9 today (`smart` against `staffswitch`) | informative |

Use `--games 36` when a result is within 5 points of a band edge (252 games give about 3 points of sampling error per policy).

### 6.2 Acceptance criteria (QA and the play pass)

Engine and advice tests (control seeds, deterministic, `tests/core/advisors.spec.ts`):

- a. No call is in `staffPickItems()` and the Accept all count equals the number of routine things, in every month of every control seed.
- b. A call exists in at least 80% of months 2 to 12 on the seven flashpoint control seeds (emulated on all seats: 86%; 83% for months 4 to 12).
- c. In at least 60% of months 2 to 12, one call has two answers where neither is at least as good as the other on all of: primary goals, bonus goals, capital cost, chance of success, and the sum of approval, stability and legitimacy (estimate 65 to 75%: true splits in 24% of months, priced crises, mission moves; to be measured).
- d. On every call at least two cards name different advisers, and no adviser backs an answer that hurts a goal when the crisis has one that does not (D-72).
- e. The staff never propose a mission order as a routine order; they propose at most 3 upkeep orders and leave the reserve of R9.
- f. An answer with the price that the bank cannot pay is returned as blocked with a reason and a fix before it can be chosen (G1).

UI guards (extend `RS-006-1` and `tests/ui-glossary.spec.ts`):

- g. The Accept all line names the open calls ("k stay open: your call"); with an open call, "If you execute now" names the Skip consequence in words at 1366 x 768, 1024 x 768 and 390 x 844.
- h. No `[data-rec]` star line on a call card without an adviser's name; "Accept" appears only in "Accept all recommended"; "Your call" comes from the glossary key.
- i. Guide me shows the Chief of Staff sentence on every call; Some help and I know this do not.

Play pass (Game Designer, D-81, the seven flashpoint control seeds played by hand at 3440 x 1440 and 1366 x 768):

- j. Real decisions per month: mean 1.0 or more over months 2 to 12, at least one in 80% of those months, never more than 3 in a month. A real decision is a thing decided with Choose where criterion c holds.
- k. Accept all share: of all things decided in the pass, 40 to 70% by Accept all (the button is still worth pressing, and the calls are not behind it).
- l. No single rule wins: playing "Accept all, Execute" on the seven seeds wins at most 2; playing "always the first card on a call" wins at most 4.

### 6.3 Entries for `quality.json` (proposed; add with their adapters, not before, because an unmeasured metric counts as not met)

```json
{
  "id": "accept-all-wins",
  "label": "Accept all alone: pooled wins (harness staff policy)",
  "gate": "D-84: Accept all recommended is not a winning strategy",
  "source": { "adapter": "balance", "args": { "metric": "staff-pooled" } },
  "direction": "lower",
  "threshold": 0.30,
  "noise": { "kind": "none", "why": "seeded harness; use --games 36 near the edge" },
  "cadence": "per-commit",
  "blocking": true
},
{
  "id": "guided-wins",
  "label": "Guided play: pooled wins (harness guided policy), band 65 to 90%",
  "gate": "D-84: a newcomer who follows the Guide me line can win",
  "source": { "adapter": "balance", "args": { "metric": "guided-in-band" } },
  "direction": "bool",
  "noise": { "kind": "none", "why": "seeded harness" },
  "cadence": "per-commit",
  "blocking": true
},
{
  "id": "call-balance",
  "label": "Mission side against calm side of the call (points apart)",
  "gate": "D-84: no fixed rule wins the call",
  "source": { "adapter": "balance", "args": { "metric": "call-gap" } },
  "direction": "lower",
  "threshold": 8,
  "noise": { "kind": "none", "why": "seeded harness" },
  "cadence": "per-commit",
  "blocking": true
},
{
  "id": "real-decisions",
  "label": "Real decisions per month (play pass, months 2 to 12, control seeds)",
  "gate": "D-81 play pass; D-84",
  "source": { "adapter": "table", "args": { "file": "runs/iter-{NN}/play-pass.md", "header": ["Measure", "Value"], "where": { "Measure": "^Real decisions per month$" }, "agg": "cell", "column": "Value" } },
  "direction": "higher",
  "threshold": 1.0,
  "noise": { "kind": "none", "why": "counted on fixed seeds" },
  "cadence": "per-iteration",
  "blocking": true
},
{
  "id": "autopilot-reports",
  "label": "Customers who report that nothing is left to decide (F-03-1 pattern)",
  "source": { "adapter": "feedback", "args": { "metric": "pattern", "id": "F-03-1" } },
  "direction": "lower",
  "threshold": 2,
  "noise": { "kind": "fixed", "band": 1, "why": "one persona more or less is noise (D-59)" },
  "cadence": "per-iteration",
  "blocking": false
}
```

The balance adapter needs three new metrics read from the band log (`staff-pooled`, `guided-in-band`, `call-gap`), and `tests/balance/bands.spec.ts` needs `POLICIES = "smart,none,random,staff,guided,callpush,callhold"` on the flashpoint runs. The existing gate metrics that this decision is meant to move are `agency` and `game-feel` (7.0 or more; agency was 6.34 in iteration 3).

### 6.4 Text for CLAUDE.md (balance targets), once built

"Accept all (harness `staff`: routine things accepted, every call skipped) wins 30% or less pooled and no seat above 60%; `guided` (Accept all plus the Guide me line on every call) 65 to 90%; always the mission side and always the calm side of the call stay within 8 points of each other; the mission side of a crisis costs 1 political capital (`PUSH_PC`); staff propose at most 3 upkeep orders and never a mission order."

## 7. Proposed ledger line

D-84, rework: Accept all recommended covers routine things only; each month has "Your call" (mission crisis, mission move) where two advisers recommend different answers and the player chooses or skips with the cost named; the mission side of a crisis costs 1 political capital; staff propose up to 3 upkeep orders and never a mission order; D-72's rule (no recommendation hurts a goal) ships only with this. Evidence: F-03-1 (nine of nine), QA3R-4a and 4b, harness rows 1 to 18 above. Rejected: widening the cabinet and mission pick gap (contradicts D-72, 13 points), lower income or cap (no effect until it breaks the smart band), price 2. Expected: `staff` 30% or less, `guided` 65 to 90%, agency 7.0 or more, real decisions per month 1.0 or more. Reversal trigger: `guided` under 65% after tuning, or two or more newcomers (Ruth, Noah, Olivia, Maya) fail to finish a first session.
