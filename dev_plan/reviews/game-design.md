# World Conflict: Game Design Review

*Senior design review, branch `feat/engagement-overhaul`, Nov 2026. All numbers come from `scripts/simulate.ts` plus a throwaway extended harness: 12 seeds per cell, 120 turns, 2025 scenario unless noted. Policies: `none` = no actions; `passive` = propaganda every month; `smart` = reform/propaganda when low, improve worst relation, sue for peace; `random` = 2 random actions; `opportunist` = mobilize then attack the main rival.*

---

## 1. Verdict

**What works.** The fantasy is strong and the foundation is honest. Leaders, regimes, red lines and backstories are historically grounded. Beliefs-not-truth AI gives real fog of war. Deposition by coup, revolution or election fits the genre, and the newspaper-first turn has the right *Conflict* (1990) tone. The engine is deterministic, which makes everything below (daily seeds, share cards, tuning by harness) cheap to build.

**What doesn't.** Today it is a **survival spreadsheet with one dominant button**. Three problems stack up. Clicking propaganda every month beats thinking. Your country choice decides your fate more than your play does. And for a typical player nothing happens to them for over a year of game time. There is no goal to chase and no arc, and a full game would take hours of six-phase turns.

### Top 10 problems, ranked by impact on retention

| # | Problem | Evidence |
|---|---|---|
| 1 | **Propaganda spam is the dominant strategy.** No diminishing returns: +4 approval, +5 legitimacy, +2 stability for $75M (`systems/stability.ts → applyPropaganda`). | `passive` finishes the term 48/48 for ISR/DEU/CHN/USA; `smart` finishes 42/48. Median final score: ISR 109 vs 84, DEU 110 vs 97. Under `passive`, approval sits ≥99 in 73–94% of months. |
| 2 | **Country choice decides the outcome.** | USA: 12/12 term completions under *every* policy, including `random` (10 A grades) and `none` (3 S). IRN: deposed 9/12 under `passive` and 12/12 under `none`. CHN `none` survives 11/12. |
| 3 | **The player is almost never asked anything.** Only 2 of 10 event templates carry a player decision (`events.ts`: border_incident, corruption_scandal). | 1.0–1.4 player crises per year; only 7–11% of months have a decision; median first crisis at **turn 15** (turn 9 in 1960). |
| 4 | **No near-loss-then-recovery arc.** | `simulate.ts` averages 0.0–0.3 comebacks per game in every cell. Passive and dove get 0.0 close calls. When a player does fall, warning time is often 1–5 turns, and coup and revolution are silent dice rolls (`government.ts → runGovernmentDynamics`). |
| 5 | **War is a trap for 24 of 25 countries.** | `opportunist` completes 0/12 for ISR, DEU and IRN and 2/12 for CHN, but 12/12 for USA. Mobilize costs −2 stability with no cap (`turn.ts` MILITARY_MOBILIZE), and winning a war earns only +12 approval with no territory or objective (`military.ts → endWar`). |
| 6 | **The money economy is broken at both ends.** Costs are flat nominal $M (`turn.ts → actionCostM`), paid from the defense budget. | In 1960, 17/25 countries can't afford propaganda and 23/25 can't afford reform: ISR has $14M/mo, so every action is rejected (1.26 rejections/month). USA 2025 has $79,800M/mo, so it never makes a trade-off. |
| 7 | **Global tension is pinned.** | Tension ≥80 in 74–97% of months; peaks at 91–96 in every run. The headline danger meter carries no signal. |
| 8 | **The score arc runs backwards.** Starts at 100, peaks around turn 12 (121–139), then declines to a final C (84–110) for most non-US runs. | The player feels worse the longer they play. The S/A grades in `scoring.ts → classifyLeadership` are reachable only by USA/RUS. |
| 9 | **Session length is wrong for every audience.** 120 turns × 6 phases (`gameStore.ts` phase machine) at a realistic 90–180 s per turn comes to **3–6 hours**. | No short mode, no mid-game checkpoints, no objectives (`grep objective` finds no game goals). |
| 10 | **Onboarding and UI friction.** | Screenshots: the map shows "API KEY REQUIRED" watermarks (CARTO tiles). The diplomacy phase is a list of 6 verbs with "select a country on the map" and no recommendation. The header shows "Leadership: 100" with no meaning attached. The intro has no stated goal. |

---

## 2. Session & mode design

Make the player pick the mode explicitly at New Game, with an honest time label on each card.

| | **Flashpoint** ("15 minutes") | **Term** ("1–2 hours, saves") | **Legacy** ("multi-day") |
|---|---|---|---|
| Player | Commuter/mobile, curious newcomer, daily-challenge player (Reigns/Plague Inc. audience) | Strategy regular who wants an arc in 1–3 sittings (Suzerain) | Grand-strategy veteran (Democracy 4/Civ) |
| Turns | 12 | 48 (one electoral term) | 120 (current) |
| Time per turn | 1 month (acute flashpoints such as Cuba 1962 or the 2025 Gulf crisis: 1 week, with growth/stability rates scaled ÷4) | 1 month | 1 quarter for peacetime, auto-switching to monthly while the player is at war or in a crisis |
| Target real time per turn | 45–60 s | 60–90 s | 60–120 s |
| Start | Scripted crisis already burning at turn 1 (rival mobilizing, unrest, a nuclear deadline) | Scenario start with 3 public mandate goals | Scenario start with 3 mandate goals per term |
| Win | Survive **and** meet the flashpoint objective (e.g., "Keep Iran below TESTED without a war", "End the war with frontline ≥50") | Survive to the election and win it | Survive 10 years; legacy score |
| Lose | Deposed, collapse, holocaust, or objective failed at turn 12 | Deposed or election lost | Deposed or term limit failed |
| Rating | 1–3 stars: objective met + score vs **par** + a bonus condition | Grade S–F vs country/scenario par, plus archetype | Grade, archetype, history-book timeline |
| End hooks | Share card, "Retry same seed", "Try as the other side" | "Run for a second term" (continues into the next 48), unlock a harder country | Timeline export, achievements |

**Why these numbers.** 12 decisions of about 1 minute each fits the owner's 10–15 minute target. One year in office also reads naturally as a story. 48 turns matches a real democratic term and builds to an election climax, which is the natural "almost lost" set piece. Legacy keeps today's sandbox, but quarterly peacetime turns cut its tedium by about 3×.

---

## 3. Tension & drama: the pacing model

**Target curve (Flashpoint, 12 turns):** inciting crisis (T1) → escalation (T2–5) → **forced low point (T6–9)** → resolution window (T10–11) → verdict (T12). Term repeats this over 48 turns as three acts, with the election as the final spike.

**Mechanisms, with engine knobs:**

1. **Drama Director.** New `src/core/director.ts`, called in `TurnEngine.executeTurn` before `EventEngine.generateEvents`. It is still deterministic: it seeds from `combineSeed`.
   - Track `dramaDebt` = turns since the last player decision. When `dramaDebt ≥ 2` (Flashpoint) or `≥ 3` (Term), force-select a player-involved template.
   - Keep `crisisCount ≤ 2` but add a floor of 1 player decision per turn in Flashpoint.
   - Phase-aware weighting: in T6–9 of a Flashpoint, bias toward the player's weakest stat (scandal if approval is high, unrest if stability is high, rival mobilization if security is high).
2. **More decision templates.** 2 → **at least 12 for launch**: coup plot, mass protest, rival ultimatum, ally asks for help, nuclear deadline, refugee wave, oil shock (player-facing), hostage crisis, election debate, sanctions vote, assassination attempt, leak. Each needs 3 options with preview deltas and one delayed consequence (a `followUp` template that fires 2–4 turns later). Delayed consequences make choices memorable.
3. **Telegraph deposition.** In `government.ts → runGovernmentDynamics`, when coup risk > 0 or revolution conditions hold, the first time **emit a "Coup Plot Uncovered" or "Streets Boiling" decision instead of rolling**. Options: purge (stability −5, legitimacy +8), buy off the generals ($ / political capital), concede (approval +10, legitimacy −6). Only roll the actual coup if the player ignores it or the situation worsens. This turns silent deaths into near-loss beats.
4. **Comeback mechanics.**
   - *Rally-round-the-flag*: when the player is attacked or suffers terror, approval +6 for 3 turns (`military.ts` already gives +1/month to defenders; raise to +3 for the first 3 months).
   - *Last-ditch cards*: below 25 stability, unlock 1 desperate option per game (state of emergency, national-unity government, early election gamble).
   - The existing `stability < 35 → +1.0` floor in `stability.ts → updateDomestic` already rubber-bands; **apply it only to AI countries** and give the player the explicit cards instead.
5. **Hubris rubber-band.** If approval > 80 for 4+ turns, raise scandal/succession-challenge odds 3× (`events.ts` corruption_scandal `baseChance` 0.06 → 0.18 for the player). Add approval mean-reversion in `updateDomestic`: `approval += (50 − approval) × 0.04` per month, plus incumbency fatigue of −0.3/month after month 24.
6. **Fix tension saturation.**
   - Decay 0.12 → **0.20**.
   - Floor `30 + wars × 8` → `25 + wars × 6`, capped at 60.
   - Halve tension added by AI-only events (border_incident +4 → +2 when the player isn't involved).
   - Target: median 45–65, ≥80 in ≤15% of months, ≥90 only around war or nuclear shocks.

**Harness targets** (extend `simulate.ts` with `--mode`, the `smart/random/none/opportunist` policies, and a per-turn decision policy):

| Metric | Flashpoint target | Term target |
|---|---|---|
| Player decisions per turn | ≥1 in ≥90% of turns | ≥1 in ≥50% of turns |
| `smart` games with ≥1 close call (stat <25 or a telegraphed coup) | 60–75% | 50–70% |
| `smart` wins that included a close call | ≥40% | ≥35% |
| Median warning before deposition | ≥2 turns, 100% telegraphed | ≥3 turns |
| Months with tension ≥80 | ≤20% | ≤15% |
| Score trend for `smart` | final > start in ≥60% | same |

---

## 4. Difficulty

**Normalize first, then add levels.** Every scenario/country gets a **par score**: the median final score of the `smart` policy in that cell, computed offline and stored in scenario JSON. Grade on `score − par`, so an IRN B equals a USA B. Add a visible difficulty tag per country (USA "Steady", ISR/IRN/PRK "Brutal") on the country picker. Also make USA harder: a midterm election at T24, a superpower-overreach event when it is at war, and a real fiscal constraint (see §5).

| Level | Changes |
|---|---|
| **Analyst** (story) | Coups and revolutions are always telegraphed 2 turns ahead; AI aggression ×0.7; previews show exact outcomes; no ironman. |
| **Statesman** (default) | Telegraph 1 turn; previews show ranges; Director floor active. |
| **Strongman** | Telegraph only when intel ≥ 50; AI aggression ×1.2; propaganda decay ×1.5; hubris events ×1.5; ironman save. |

**Making the strategy bands come out right** (Statesman, Flashpoint):
- **Passive/none loses (win ≤15%).** Add mean-reversion and fatigue (above). Make propaganda decay: effect × `0.6^(uses in last 6 turns)`. Give democracies a credibility backlash: legitimacy −2 on the 3rd consecutive use. Flashpoint objectives require action (ignoring the crisis fails it).
- **Reckless loses (win ≤20%).** Keep it, but make it *legible*: show a preview red banner "Generals estimate 70% chance this war topples you". Cap mobilization's stability cost so it stops looking like a hidden timer: −2 only above 60% mobilization.
- **Skilled wins 55–70%.** Give wars *objectives* (frontline ≥70 for 2 turns = "limited victory": approval +15, prestige +10, ends the war). Add political capital so the right sequence of actions matters (§5). Make crisis options have asymmetric, readable trade-offs.
- **Acceptance:** for 10 representative countries, `smart` win rate is between 55 and 70%, `passive` ≤20%, `opportunist` ≤25%, `random` ≤15%.

---

## 5. Turn flow & action economy

**Replace the 6-phase wizard with one "Desk" screen** (Flashpoint and Term default; the wizard stays in Legacy as "Full Cabinet").

1. **Headline strip**: 3 headlines, one tap to expand (replaces the News and Briefing phases).
2. **Crisis card**: one per turn when present. Reigns-style choice of 2–3 options, each with a 3-stat preview chip. This is the main decision.
3. **Initiatives**: spend **Political Capital (PC)**, 3 per turn (+1 at approval > 70, −1 under 35). Advisors pre-fill the 3 best contextual initiatives, and one tap accepts. The full action list sits in an "Advanced" drawer.
4. **Standing orders**: persistent posture toggles: policing soft/hard, readiness low/med/high, defense spending −/=/+. They carry over automatically, so a turn with nothing new is a single "End Month" tap.

That gives 1 crisis + 0–2 initiatives per turn, about 45 s.

**Money vs PC.** Keep $ only for military procurement and nuclear work, scaled as % of budget (`actionCostM` returns `pct × monthlyDefenseBudgetM`). Domestic, diplomatic and covert actions cost PC. This fixes both 1960 paralysis and USA's unlimited budget.

| Keep (front) | Merge | Advanced drawer / Legacy only |
|---|---|---|
| Improve relations (1 PC), Denounce (0 PC, −relations), Propose pact (2 PC), Ceasefire, Declare war (contextual, red preview), Reform (2 PC), Propaganda (1 PC, decays), Covert op (2 PC, choose target and type), Fund nuclear (contextual) | Mobilize/Demobilize → **Readiness** posture; Deploy/Withdraw border → **Border posture** per rival; Procure + Adjust budget → **Defense spending**; Intel gather + counter-intel → **Intel focus** | Break alliance, Airstrike target types, Assassinate, Coup, Support rebels, Misinformation. Nuclear strike appears only while at war with warheads available. |

The UI currently exposes 22 buttons (`ActionPanel.tsx`). The front tier drops to about 9 contextual verbs.

---

## 6. Retention loop (minimal scope first)

1. **Shareable end card (P0, ~2 days).** Contains the grade, archetype (`classifyLeadership` already exists), country/scenario, stars, and a Wordle-style emoji strip of 12 turns (🟩 calm, 🟨 strain, 🟥 near-loss, ☢️), e.g. "Survived 2 coup plots". Copy to clipboard + PNG.
2. **Daily Flashpoint (P0, ~3 days).** Seed = `hash(date)`, the same country and crisis for everyone. Determinism makes it free. Show your stars vs the global median (one tiny endpoint) and a streak counter.
3. **Achievements (P1).** About 30, mostly *narrative*: "Thirteen Days" (defuse a nuclear standoff), "Survived a coup plot", "Peace with a historical rival", "Won as IRN on Strongman". Each one teaches a mechanic.
4. **Unlocks (P1).** Start with 6 countries across difficulty bands. Unlock others by 1-starring a Flashpoint as a neighbor/rival. Unlock scenarios (1960/1990) by completing a Term.
5. **Flashpoint library (P1).** Hand-authored and current-events-relevant: Israel–Iran 2025, Taiwan Strait, Venezuela 2026, Sahel coups, Cuba 1962, Kuwait 1990. Ship 2 per month as a live-ops cadence.
6. **Leader career (P2).** Persistent profile with archetype history, a "Hall of Leaders", and second-term continuation.

---

## 7. Prioritized backlog

Unless noted, measure on 12 seeds × 10 representative countries (USA, CHN, RUS, DEU, GBR, IND, ISR, IRN, TUR, PRK).

### P0: make the core loop a game

| Item | Files | Acceptance |
|---|---|---|
| Extend harness: `--mode`, policies `none/smart/random/opportunist`, decision policy flag, tension histogram, decisions/turn, warning-turns, win% vs par | `scripts/simulate.ts` | Prints all §3/§4 metrics as JSON; the CI perf job stays under 60 s |
| Propaganda decay + approval mean-reversion + incumbency fatigue | `systems/stability.ts` | `passive` Term completion ≤40% (from 100% for ISR/DEU/CHN); approval ≥99 in ≤5% of months |
| Telegraphed coup/revolution decisions | `systems/government.ts`, `events.ts` | 100% of non-election depositions preceded by a player decision ≥1 turn earlier; `smart` close-call rate 50–75% |
| Drama Director + 10 new decision templates with follow-ups | `src/core/director.ts`, `events.ts` | Flashpoint: ≥1 decision in ≥90% of turns; first decision at T1 |
| Tension rebalance | `turn.ts` Phase 6, `events.ts` | Months ≥80 ≤15%; median 45–65 |
| Flashpoint mode (12 turns, objective, stars) + 2 authored flashpoints | `types.ts` (Scenario `mode`, `objectives`, `turnLength`), `data-loader.ts`, `turn.ts → checkGameOver` | `smart` 3-star/win 55–70%, `passive` ≤15%, `opportunist` ≤25%; median playtest session 10–15 min (5 testers) |
| Par-based grading | `scoring.ts`, scenario JSON | `smart` median grade within one letter (C/B) across all 10 countries; USA `random` no longer gets A |
| Desk turn UI (headlines + crisis card + 3 suggested initiatives + End Month) | `ui/src/store/gameStore.ts`, new `DeskView.tsx` | Median turn time ≤60 s in playtest; ≤3 taps for a no-crisis turn |
| End card + Daily Flashpoint | `EndGameReport.tsx`, `/api/daily` | Card renders in <1 s; daily seed reproduces identical worlds (add to `determinism.spec.ts`) |
| Fix map tile watermark | `MapView.tsx` | No "API KEY REQUIRED" visible |

### P1: depth and fairness

| Item | Acceptance |
|---|---|
| Political Capital + %-of-budget costs | 1960 ISR rejected actions/month <0.1 (from 1.26); USA 2025 cannot take every action in a turn (PC binds in ≥50% of turns) |
| War objectives / limited victory; capped mobilization cost | `opportunist` win 15–25% (not 0% and not 100%); USA `opportunist` ≤60% |
| Term mode (48 turns, election finale, mandate goals) | `smart` completion 55–70%; ≥1 close call in 50–70% of games |
| Difficulty levels (Analyst/Statesman/Strongman) | Strongman `smart` win 30–45%; Analyst 75–90% |
| Achievements (30) + country unlocks | n/a |
| Rally-round-the-flag + last-ditch cards | Comebacks per game ≥0.4 for `smart` (from 0.0–0.3) |

### P2: long tail

Legacy mode with quarterly turns; Flashpoint library cadence; leader career profile; UI type sharing between backend and frontend (removes the drift risk noted in CLAUDE.md); an LLM "press conference" flavor layer on crisis cards (optional, with `fallback.ts` behavior unchanged).

---

*Harness caveats:* `simulate.ts` always picks decision option index 1 and never sees the UI. The 120-turn runs report `RUNNING` instead of `TERM_COMPLETED` because `checkGameOver` tests `turn ≥ 120` before the clock advances. Fix this in the harness extension.
