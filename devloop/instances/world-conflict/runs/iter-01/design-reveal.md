# Design: The Reveal (G10, with G9 and replay)

Owner: Game Designer, with the Art Director (look, motion, seals) and the Content Consultant (reality rows, press lines, judgement lines). Iteration 1. Concept: `concepts/reveal-storyboard.html` (8 frames, one per stage; screenshots `concepts/shots/reveal-f0..f7-1440.png` and `-390.png`). Real copy uses Hormuz Convoy, United States seat; numbers are internally consistent with the formulas below (approval 44 to 61, score 100 to 119, par 107, 3 stars, grade A per `gradeFor`). The stage 0 illustration is a placeholder: the build uses `SceneFrame` with the existing `END_SCENE` kind. On phones the control bar is sticky in the app; it is static in the storyboard only so element screenshots do not overlap.

## 1. Problem

| Id | Evidence | What it tells us |
|---|---|---|
| RS-002 | CEO: "the game end is not great, it was an unformatted message of what really happened... we need fantastic appealing graphics with achievements, things that went bad, how the leadership was perceived... measurable... ranking... looking forward to the end of game experience for the reveal" | The end is the memory of the game. Today it is a grade box, a checklist and one paragraph of debrief text. |
| Priya (`iter-00/sessions/priya-flash.md`, shot `priya-flash/036-us.png`) | "No real-world context. I came to learn what really happened." | Reality must be formatted and placed next to her own outcome, not appended as prose. |
| Ruth (`ruth-tablet.md`) | Wish: "tell me in plain words... how the Ukraine war moved because of what I did, and what really happened" | Plain words, one row per topic, big type on tablet. |
| Marcus (`marcus-term.md`, shot `marcus-term/050-B1.png`) | "The second game opened with a different crisis... there is no seed". Wish: "same-seed restart... side-by-side of two runs" | Rematch today calls `/new-game` without `seed`, so the server rolls `createSeed(Date.now()...Math.random())` (`src/api/routes/game.ts` ~line 148). The engine already accepts `seed` and the opening crisis is `runDirector(world, combineSeed(world.seed, 31337))` (`data-loader.ts` ~258): a same-seed replay is cheap. |
| Dan (`dan-term.md`, shot `dan-term/017-m1.png`) | "I cannot audit" the score | Every number in the reveal must be itemised: no unexplained composite. |
| Leo, Noah (`noah-phone.md`, shot `noah-phone/005-exec1.png`) | "That one I would screenshot" | Each stage must be a screenshot-worthy frame on its own, plus a better share card. |
| Panel gap | Nobody reached the end in iteration 0 | QA must fast-forward at least three personas to the end (RS-002 correction). |

Current code: `ui/src/components/EndScreen.tsx` (scene, verdict, grade, conditions, emoji month grid, debrief string, share/save card/copy/rematch/new game), `EndGameReport.tsx` (legacy modal: score bars, score sparkline, world timeline). Data available today: `world.scoreHistory` (turn, gdp, stability, approval, tension, score), `world.timeline` (world-level MAJOR events, not player-centric), `director.record` (order counts), `director.ledger`, `rallies`, `closeCalls`, `outcome`, `objective.debrief` (one string, "What really happened: ... What experts fear: ..."). Missing: per-month objective status, real growth, relations, score components, a player-centric moments log (the `turnReport` is overwritten every month, so its `moments` and decisions are lost), casualties attributed to the player, and anything comparable across runs.

## 2. Design

### 2.1 Shape: a seven-stage reveal, then a report you keep

The reveal plays once per finished save, like election night: each stage builds on the last, the player taps "Next" (or waits) and always knows what is coming (a stage rail shows the seven stage names from the first second, which is the anticipation hook: "Ranking" is always visible at the end of the rail). After the last stage the same content stays as a scrollable report (the "Dossier"), reopenable from the save list and from the title screen ("Your record").

| # | Stage | Beat | Length (auto) |
|---|---|---|---|
| 0 | **The count** | Closing scene (`SceneFrame`, existing `END_SCENE` map). "The record is sealed." The month strip fills cell by cell (existing emoji grid logic, now coloured SVG cells), then holds on the final cell. | 3 s |
| 1 | **The verdict** | Stamp slams: MISSION COMPLETE / VOTED OUT etc. Grade letter flips in, stars ignite one at a time, Presidency Score counts up while its four parts tally under it. "New personal best" ribbon if it is. | 4 s |
| 2 | **Achievements** | Seals drop in one at a time, rarest last, with rarity label and the month earned. Infamy seals (things that went badly) arrive in red after the good ones. Two locked silhouettes show "within reach next time" hints. | 1 s per seal, max 8 shown, "+N more" |
| 3 | **The moments** | A month axis draws left to right. Markers pop on it: best moment (gold), worst moment (red), turning point. Two columns underneath: "What went well" and "What went badly", each 3 lines with the month. Timing callouts: "Ended the war in month 6 of 12". | 4 s |
| 4 | **How you were seen** | Approval curve draws (with the ghost line of your previous best run on this seat), election markers, then three press cards (home press, ally press, rival press) and the allies/rivals ledger (relation before and after). Ends on "History's judgement" in serif. | 5 s |
| 5 | **The numbers** | Six small multiples (approval, real growth, stability, world tension, leadership score, plus a counts tile: wars, deals, orders, crises, lives lost). Each with start, end, best, worst. | 3 s |
| 6 | **The truth** | Two parts. *Declassified*: the fog lifts on up to three things you could not see (the rival's real nuclear progress vs your last estimate, the rival's real strength, a plot against you). *What really happened*: a two-column table, "In your world" vs "In the real world (to Nov 2026)", one row per topic, with a verdict chip per row (Better / Same / Worse than reality, or Context when the two are not comparable, Open for the forward-looking fear row) and sources. | 5 s |
| 7 | **Ranking and replay** | Your Presidency Score on a ladder of benchmark runs (do-nothing staff, random staff, competent staff, best known) with your percentile, your personal history on this seat, "Beat 724: the next star is Stability 60%+", and three buttons: Replay same opening, New world, Compare runs. Share bar. | holds |

Controls on every stage: Next (primary, also tap anywhere on 390 / Space or Right arrow on desktop), Back, "Skip to the report" (ghost link, always visible), sound toggle if sound exists. With `prefers-reduced-motion` every stage renders final-state instantly and auto-advance is off. The reveal never blocks: a player who skips lands on the full report.

### 2.2 The Presidency Score (comparable, auditable)

0 to 1000, always shown with its four parts. It is deliberately not the 0-200 leadership score (which stays the month-to-month meter); it rewards finishing the job, doing it early and staying strong throughout, so two presidencies on the same seat are comparable.

| Part | Max | Formula (all inputs recorded in `world.chronicle`) |
|---|---|---|
| Mission | 400 | 300 x share of primary conditions met at the end (including "Stay in power") + 50 per bonus met (max 100). Term/Legacy use their generated objectives. |
| Timing | 100 | 100 x share of months in which every primary condition was met (from `chronicle.series[].objectives`). Rewards "ended the war in month 6" over "ended it in month 12". |
| Leadership | 300 | 1.5 x mean monthly leadership score (0-200) over the session. Sustained, not end-spiked. |
| Finish | 200 | clamp(100 x final leadership score / par, 0, 200). |
| Modifiers | | NUCLEAR_HOLOCAUST: total 0. Deposed (coup, revolution, assassination, election loss, impeachment, collapse): x 0.6, Mission part counts only conditions met at the moment of the fall. |

Worked example (concept): 400 + 50 + 163 + 111 = **724**. Ranking is always within a *seat* (`seatKey = flashpointId:side` or `scenario:mode:country`) and a difficulty setting (ANALYST / STATESMAN / STRONGMAN), so no cross-seat multiplier is needed for the leaderboard. A career total for the title screen uses x0.85 / x1.0 / x1.15 by difficulty and is labelled as such.

Grade and stars stay exactly as today (`scoring.ts gradeFor`, `objectives.ts computeOutcome`); the Presidency Score sits next to them, it does not replace them.

### 2.3 Achievement catalogue (37 core + 1 signature per flashpoint side)

Rarity is measured, not guessed: the share of benchmark runs (smart + random + none policies, pooled per mode) that earn it, written by the harness to `data/benchmarks/achievements.json`. Tiers: Common 40%+, Uncommon 15-40%, Rare 4-15%, Legendary under 4%. The seal shows the tier and "earned by N% of simulated leaders". Infamy seals are tracked the same way but styled red: they are the "things that went bad" made collectible, and they never subtract from the score.

| Id | Name | Rule (all from `chronicle` + world) | Modes | Expected tier |
|---|---|---|---|---|
| sworn_in | Sworn In | Complete your first month | All | Common |
| full_term | Full Term | Reach the final month in office | All | Common |
| clean_sheet | Clean Sheet | Every primary and bonus objective met (3 stars) | All | Rare |
| ahead_of_schedule | Ahead of Schedule | All primary conditions met by the halfway month and held to the end | All | Rare |
| photo_finish | Photo Finish | Win with a numeric condition met by 2 points or less | All | Uncommon |
| peacemaker | Peacemaker | A war you were fighting ends in a ceasefire | All | Uncommon |
| quick_peace | Quick Peace | A war you were fighting ends before the halfway month | All | Rare |
| no_shot_fired | Never Fired a Shot | No airstrike, invasion or attack order all session | All | Uncommon |
| comeback_kid | Comeback Kid | Recover from min(approval, stability) under 30 to over 50 (`director.rallies`) | All | Rare |
| nerves_of_steel | Nerves of Steel | Survive 3 close calls | All | Rare |
| iron_approval | Iron Approval | Approval never below 40% | All | Uncommon |
| landslide | Landslide | Approval 65%+ at the end | All | Rare |
| boom_times | Boom Times | Real growth 3%+ at the end | All | Uncommon |
| no_recession | Bulletproof | Real growth never negative | All | Uncommon |
| steady_state | Steady State | Stability never below 50% | All | Uncommon |
| cooler_heads | Cooler Heads | World tension 20+ points lower than at the start | All | Uncommon |
| world_at_peace | World at Peace | No war anywhere in the final month | All | Legendary |
| bridge_builder | Bridge Builder | Relations with your worst starting rival up 40+ | All | Rare |
| coalition | Coalition | Sign a defence pact or alliance (moment NEW ALLIANCE) | All | Uncommon |
| dealmaker | Dealmaker | 3 trade or diplomatic agreements carried out | All | Uncommon |
| spymaster | Spymaster | 3 successful covert operations, none exposed | All | Rare |
| staff_knows_best | By the Book | Follow the staff recommendation in every crisis | All | Common |
| against_advice | Against Advice | Overrule the cabinet in 5 crises and still win | All | Rare |
| full_desk | Full Desk | Issue the maximum 6 orders in one month | All | Common |
| first_strike_rival_nuke | Counter-Proliferator | A rival's nuclear status is lower at the end than at the start | All | Rare |
| lame_duck | Lame Duck (infamy) | Approval below 30% at any point | All | Common |
| the_hawk | The Hawk (infamy) | You started a war | All | Uncommon |
| pariah | Pariah (infamy) | Three countries at -60 or worse with you at once | All | Uncommon |
| exposed | Caught Red-Handed (infamy) | A covert operation is exposed | All | Common |
| deposed | Shown the Door (infamy) | Lose office by election, coup, revolution or impeachment | All | Common |
| mushroom_cloud | Midnight (infamy) | A nuclear weapon is used by anyone | All | Legendary |
| defused | Defused | 3 stars on a TOUGH or BRUTAL flashpoint seat | Flashpoint | Rare |
| history_rewritten | History Rewritten | "Better than reality" on every row of the truth table | Flashpoint | Rare |
| re_elected | Four More Years | Win the Term election with 55%+ | Term | Uncommon |
| statecraft | Statecraft | Meet the Term statecraft bonus | Term | Rare |
| decade | A Decade in Power | Reach month 120 | Legacy | Rare |
| dynasty | Dynasty | Approval 50%+ in each of the last 24 months | Legacy | Legendary |
| *signature* | One per flashpoint side, authored in JSON (`signature` field). Example, Hormuz USA: **Strait Open, Bomb Never**: the US-Iran war ends before month 7 and Iran never passes DEVELOPING | Flashpoint | Rare |

Daily streak keeps its existing card (`recordDailyResult`); a 7-day streak shows as an extra seal client-side only.

### 2.4 Moments: what went well, what went badly

The engine writes a player-centric log every month (`chronicle.moments`, section 4). The reveal model picks:
- **Best moment**: highest positive `weight`; **worst moment**: lowest; **turning point**: the month with the largest 3-month swing in leadership score.
- **Went well / went badly**: top 3 by |weight| of each tone, each rendered as "Month N . title . one-line consequence with a number" ("Month 6 . The shooting stops . ceasefire with Iran, tension 72 to 63").
- **Timing callouts** (max 3): first month each primary condition was met and held ("Iran kept from a bomb: all 12 months"; "Approval 56%+: from month 7"), war start/end months, election month result.

### 2.5 Perception

- **Public**: approval curve with election markers and the ghost of your best previous run on this seat (dashed, from local run history). Caption gives start, low, high, end.
- **Allies and rivals**: up to 5 rows (objective targets first, then largest absolute change): flag, name, before, after, a diverging bar, a one-word label (Closer, Cooler, Thaw, Rupture).
- **The press**: three short quotes, deterministic, chosen from templates by data (home press reads approval trend and economy; ally press reads the largest ally relation change; rival press reads the rival's change and your war record). Outlets are generic and fictional by role ("The capital's paper", "Gulf business daily", "Tehran state television"): never a real masthead.
- **History's judgement**: one serif line from a table keyed on (verdict, classification from `classifyLeadership`, best achievement). Example: "A president who chose a quiet channel over a loud war, and was proved right by the summer."

### 2.6 The truth: declassified and what really happened

- **Declassified** (new, only after game over, so no fog leak during play): up to 3 cards comparing the player's last belief to ground truth. Sources: `me.beliefs[rival].nuclearProgress` vs `rival.nuclear.progress`, belief vs true military strength, and any coup plot or covert op against the player that was foiled or undetected. The payload computes these server-side and is the only place ground truth for foreign countries crosses `publicWorldState`.
- **What really happened**: flashpoint JSON gains a structured `reality` block per side (section 4.3). Each row pairs a topic with the real-world outcome to November 2026 and a rule that reads the player's world to fill "In your world" and decide Better / Same / Worse (or Context / Open). The existing `debrief` string remains as the fallback and as "Read the full debrief" (expander). "What experts fear" becomes a final row styled as a forward look. Sources list links under the table. Term/Legacy on the 2026 scenario use a short per-country reality block where authored; otherwise the stage shows only Declassified.

### 2.7 Ranking, history, replay, compare

- **Run record** (client and server): `{ seatKey, seed, difficulty, mode, date, presidencyScore, parts, grade, stars, verdict, achievements[], series: {approval[], score[]}, aiTier, saveId }`. Stored in `localStorage['worldconflict.runs']` (wrapped in try/catch, capped at 200 runs, oldest dropped) and, when the backend is available, POSTed to `/api/runs` keyed by `playerId` or guest id.
- **Ladder**: vertical bar from 0 to 1000 with benchmark ticks for the seat (do-nothing, random, competent staff median and p90, best known), your previous best, and you. Percentile = share of competent-staff benchmark runs you beat, labelled "better than 81% of simulated competent leaders".
- **Personal history**: last 5 runs on this seat (date, grade, score, stars, one achievement), best highlighted; "New record +113" ribbon.
- **Beat this next time**: one line choosing the cheapest missing improvement: a missed bonus ("the next star is Stability 60%+"), else the Timing part ("meet all goals 2 months earlier for about +17"), else a near-miss achievement.
- **Replay same opening**: `startGame({..., seed: world.seed})`. Same seed gives the same starting world and the same opening crisis; later months diverge only through your choices. If rival AI used an LLM tier during the run (`aiTier != ALGORITHMIC`), the button shows "Rivals used LLMs: later months may differ".
- **New world**: today's Rematch (new seed). **New game**: today's button.
- **Compare runs**: side-by-side of this run and any previous run on the same seat: Presidency Score parts, approval and score curves overlaid, achievements diff, the crisis choices made each month in two columns with the first month they differ marked "Your choices split here". Runs with the same seed are flagged "Same opening".

### 2.8 Share card

The 1200x630 PNG (today `drawCard` in `EndScreen.tsx`) gets: the Presidency Score and seat rank ("#1 of your 3 runs, top 19% of simulated leaders") as the hero number next to the grade, the three rarest achievements as seals, the month strip as coloured squares with the best moment and its month underneath, and the "Can you beat 724?" line with the site and, for Marcus, a seed code (`HZ-USA-48213`) that a friend can type into "Play this seed" on the title screen. The text share keeps the emoji grid and adds the score and seed. A second 1080x1350 portrait card for phones (Noah) uses the same blocks stacked.

### 2.9 Layout per breakpoint

- **390 (phone)**: full-screen stage, stage rail collapses to 7 dots plus the current stage name at the top; content one column; charts 342 px wide, 120 px tall; the truth table becomes stacked row cards (topic, then "Your world" and "Real world" one under the other with the verdict chip); actions as a sticky bottom bar (Next, and on the last stage Replay + Share). Tap anywhere advances.
- **1024 (tablet, Ruth)**: two columns inside each stage; minimum body text 16 px, verdict 64 px; truth table as a real table; touch targets 48 px.
- **1440 (desktop)**: left stage rail (stage names with check marks for seen stages), stage content max 1120 px; achievements in a row of 6; numbers as a 3x2 grid; the truth table at full width with sources inline.

## 3. Component spec

New folder `ui/src/components/reveal/`:

| Component | Props / state | Notes |
|---|---|---|
| `RevealSequence` | `reveal: RevealPayload`, `onDone()`; state `stage 0..7`, `seen:Set` | Hosts the rail, controls, keyboard, reduced motion, localStorage `wc.revealSeen.<saveId>` |
| `StageRail` | `stages`, `current`, `seen` | Dots at 390, labelled list at 1024+ |
| `VerdictStamp` | `verdict`, `victory`, `grade`, `stars` | Stamp rotates -4deg, scale 1.4 to 1 over 220 ms `--ease-out`; stars ignite at 300 ms intervals |
| `ScoreTally` | `parts[]`, `total`, `best?` | Count-up 900 ms (tabular mono), each part bar fills in sequence; "New record" ribbon |
| `Seal` | `achievement`, `rarity`, `infamy`, `locked` | 96 px (desktop) / 72 px (phone) SVG seal, rarity ring colour, earned month; locked = outline + hint |
| `MomentAxis` | `months`, `moments[]`, `highlights` | SVG axis, marker pop 120 ms each |
| `MiniChart` | `series`, `ghost?`, `markers?`, `domain`, `unit` | SVG polyline, path-length draw 700 ms, start/end labels, no library |
| `PressCard` | `outlet`, `quote`, `tone` | Instrument Serif quote, outlet in mono caps |
| `RelationRow` | `id, before, after, label` | Diverging bar around 0 |
| `TruthTable` | `rows[]`, `sources[]` | Table at 1024+, stacked cards at 390 |
| `DeclassifiedCard` | `label, believed, actual, unit` | Redaction bar wipes away (300 ms) to reveal the true number |
| `RankLadder` | `you, best, benchmarks, percentile` | Vertical at 1024+, horizontal at 390 |
| `RunHistory`, `CompareRuns` | runs from `lib/runs.ts` | Compare opens as its own overlay |
| `ShareBar` | existing share/save/copy actions | Uses `lib/shareCard.ts` |

Tokens: reuse `wc.css` (`--accent` gold for good/best, `--war` red for infamy/worst, `--intel` for declassified, `--ally`/`--rival` for relation bars, `--font-news` for headlines and judgement, `--font-mono` for numbers). New tokens: `--rarity-common: #8693a6`, `--rarity-uncommon: #56c596`, `--rarity-rare: #4fb3d9`, `--rarity-legendary: #f2a93b`, `--infamy: #e5383b`. Rarity is never colour-only: each seal also carries the tier word. Motion: transforms and opacity only, at most one live `SceneFrame` (stage 0 and 1 background), others static; total animated elements on screen under 40.

## 4. Engine and API needs

### 4.1 Record during the game: `world.chronicle` (WP1)

Added to `WorldStateSchema` with defaults so old saves load (reveal then degrades to `scoreHistory`):

```ts
ChronicleSchema = z.object({
  series: z.array(z.object({
    turn: z.number(),
    approval: z.number(), stability: z.number(), legitimacy: z.number(),
    realGrowth: z.number(), gdp: z.number(), tension: z.number(),
    score: z.number(), parts: z.tuple([z.number(), z.number(), z.number(), z.number()]), // econ, sec, approval, prestige
    objectives: z.array(z.boolean()),            // per primary+bonus condition, met this month
    relations: z.record(z.string(), z.number()), // tracked ids only: objective targets + top 3 allies/rivals at start
    playerWars: z.number(), capital: z.number(), orders: z.number(),
  })).default([]),
  moments: z.array(z.object({
    turn: z.number(),
    kind: z.enum(["CRISIS","ORDER","WAR_START","WAR_END","PACT","ELECTION","CLOSE_CALL","COMEBACK",
                  "OBJECTIVE_MET","OBJECTIVE_LOST","NUCLEAR","COVERT_EXPOSED","RECORD"]),
    title: z.string(), detail: z.string().default(""),
    tone: z.enum(["good","bad","neutral"]), weight: z.number(), // signed, from deltas
    choice: z.string().optional(), staffPick: z.boolean().optional(), // crises: followed the staff?
    with: z.string().optional(),
  })).default([]),
  firsts: z.record(z.string(), z.number()).default({}), // "cond:2" -> first month met and held, "war:<id>:end"
  casualties: z.number().default(0),                    // player's side, wars it fought
  deals: z.number().default(0),
  covert: z.object({ ok: z.number(), exposed: z.number() }).default({ ok: 0, exposed: 0 }),
  start: z.object({ tension: z.number(), worstRival: z.string(), nuclear: z.record(z.string(), z.string()) }).optional(),
  aiTiersUsed: z.array(z.string()).default([]),         // set by the route, not the engine
})
```

Written by a new pure `recordMonth(world, report)` in `src/core/chronicle.ts`, called from `TurnEngine.executeTurn` after scoring and the turn report are built and after objective evaluation (so the final month is included), and once from `DataLoader.newGame()` for `start`. Weights come from the report's deltas (approval, stability, score, relations, war front) so they are deterministic. No randomness; `determinism.spec.ts` must stay green. Size: 120 months x ~25 numbers, fine for SQLite and JSON saves.

### 4.2 Reveal model: `src/core/reveal.ts` (WP2)

Pure function `buildReveal(world, benchmarks?, achievementsRarity?) => RevealPayload` with: verdict, grade, stars, presidency score and parts, achievements (id, earnedTurn, rarity), moments (best, worst, turning point, wellList, badList, timing callouts), perception (series, relation rows, press quotes, judgement), numbers (six series with start/end/min/max and counts), declassified cards, truth rows (with Better/Same/Worse), replay `{ seed, seatKey, mode, scenarioId, flashpointId, difficulty, deterministic: boolean }`, benchmark ladder for the seat. Achievements catalogue and predicates in `src/core/achievements.ts` (data + functions, unit-tested one by one). Press and judgement templates in `src/core/reveal-text.ts` using `possessive()` / `withArticle()`.

### 4.3 Content: structured reality in flashpoints (WP4)

`FlashpointSchema` (in `src/core/data-loader.ts`) gains, per side under `objectives.<SIDE>`:

```json
"reality": {
  "asOf": "2026-11",
  "rows": [
    { "topic": "The strait", "real": "Closed and reopened several times; by November, blockade against harassment.",
      "yours": { "kind": "WAR_ENDED", "targetId": "USA", "otherId": "IRN" },
      "yoursText": { "met": "Reopened: the US-Iran war ended in month {firstMet}.", "missed": "Still contested at the end." },
      "better": "met" }
  ],
  "fear": "A surviving hardline regime with 200-plus kg of 60% uranium; a Gulf energy shock.",
  "sources": [0, 1, 3]
},
"signature": { "id": "hormuz_strait_open", "name": "Strait Open, Bomb Never", "rule": "..." }
```

`yours` reuses `ObjectiveCondition` so `evaluateCondition` drives it; `better` says which result beats reality. All 8 flashpoints x every playable side need rows (3 to 5 each); the Content Consultant writes them, hedged ("reportedly") and short (one line each). `debrief` stays.

### 4.4 API and storage (WP3)

- `GET /api/reveal/:saveId`: 409 unless `gameOver`; returns `buildReveal(...)`. Ground truth only for the declassified cards.
- `POST /api/runs` (body: run record derived server-side from the save, client sends only `saveId` and guest id) and `GET /api/runs?seat=&playerId=`: personal history and, when accounts exist, a per-seat top 20 by score. New Prisma model `RunResult { id, saveId @unique, playerId?, guestId?, seatKey, difficulty, seed, score, grade, stars, verdict, parts Json-string, achievements Json-string, createdAt }` and the JSON store equivalent `saves/runs.json` in `JsonStore`.
- `/new-game` already accepts `seed`; the UI's `NewGameRequest` gains `seed?: number`. `/new-game` also accepts `seedCode` ("HZ-USA-48213") parsed to seat + seed for "Play this seed".
- `/turn` appends the AI tier used that month to `chronicle.aiTiersUsed` (route-level, not in core).
- Benchmarks (WP5): `scripts/simulate.ts --benchmark 1` runs each seat with smart / random / none (36 games each), computes Presidency Score with the same `buildReveal` code and writes `data/benchmarks/<seatKey>.json` (`{ policy: { p10, p50, p90, max, n } }`) plus `data/benchmarks/achievements.json` (earn rates). Committed; regenerated when balance changes.

## 5. Acceptance criteria (QA)

1. Finishing any session (win, loss, deposition) opens stage 0 of the reveal within 1 s of the last debrief, before the old end screen content; the stage rail shows all 7 stage names (or 7 dots and the current name at 390).
2. Next, tap anywhere (390), Space and Right arrow advance; Back returns; "Skip to the report" lands on the full scrollable report from any stage.
3. With `prefers-reduced-motion: reduce`, no element animates and every stage shows its final state on entry.
4. Stage 1 shows verdict, grade, stars (same values as today's `outcome` and `gradeFor`) and a Presidency Score whose four parts are listed and sum (after modifiers) to the total.
5. For a fixed save fixture, the Presidency Score equals the formula in 2.2 computed by hand (unit test in `tests/core/reveal.spec.ts`).
6. Stage 2 lists every earned achievement (at most 8 animated, "+N more" opens the rest), each with name, tier word, month earned and "earned by N% of simulated leaders"; infamy seals are red and appear after good ones; two locked hints are shown.
7. Each of the 37 achievement predicates has a unit test with one earning and one non-earning fixture.
8. Stage 3 shows a month axis with best (gold), worst (red) and turning-point markers, 3 "went well" and 3 "went badly" lines each starting "Month N", and at least one timing callout naming a month.
9. Stage 4 shows the approval curve with election markers, the ghost line of the best previous run on this seat when one exists, 3 press quotes from fictional outlets, up to 5 relation rows with before/after numbers, and one "History's judgement" line.
10. Stage 5 shows six series charts with start and end values matching `chronicle.series` first and last entries, and counts for wars, deals, orders, crises and lives lost.
11. Stage 6 on every flashpoint side shows a truth table with 3 to 5 rows, each with "In your world", "In the real world", a Better/Same/Worse/Context chip (visible at 390 too), plus a "What experts feared" row and source links; the full debrief text is still reachable.
12. Declassified cards appear only after game over: `/api/turn` and `/api/load` responses for a running game contain no foreign ground truth beyond today's (regression test on `publicWorldState`).
13. Stage 7 shows the ladder with the seat's benchmark ticks, your percentile, your last 5 runs on the seat, and one "beat this next time" line naming a concrete target.
14. "Replay same opening" starts a new save with the same `seed` and the same first crisis headline as the finished run (API test: two `/new-game` calls with the same seed and seat produce identical `pendingDecisions[0]`).
15. Playing the same seed with the same orders and crisis choices (ALGORITHMIC tier) yields the same Presidency Score (determinism test over a 12-turn flashpoint).
16. "Compare runs" shows two runs side by side with parts, overlaid curves, achievement diff and the first month their crisis choices differ.
17. Run history survives a reload (localStorage) and, with the API up, `GET /api/runs?seat=` returns the run; with localStorage blocked the reveal still renders (no history, no crash).
18. The saved share card PNG is 1200x630, contains score, grade, rank line, three seals, month strip and seed code; the portrait card is 1080x1350; text share includes score and seed code.
19. Old saves without `chronicle` still open the end screen and a reduced reveal (verdict, numbers from `scoreHistory`, report) without errors.
20. At 390, 1024 and 1440 no stage scrolls horizontally; all text 14 px or larger at 390 and 16 px or larger body at 1024; touch targets 44 px (48 px at 1024).
21. The reveal holds 50+ fps on a mid laptop profile and never runs more than one live `SceneFrame` at once (DevTools performance trace on stage transitions).
22. No em dash characters in new copy or code (`tests/repo-style.spec.ts`).
23. Panel: at least three personas (one per archetype group: Leo/Noah, Dan/Marcus, Priya/Ruth) reach the end; at least two say they want to replay to beat the score.

## 6. Build plan (independent work packages)

The schema contracts in 4.1 to 4.4 are frozen by this doc, so packages can start in parallel; WP2 and WP6 build against fixtures until WP1 lands.

| WP | Owner | Scope | Files (exclusive unless noted) |
|---|---|---|---|
| WP1 Chronicle recording | Engine | `ChronicleSchema`, `recordMonth`, start snapshot, weights, firsts, casualties, deals, covert | `src/core/types.ts` (schema only), new `src/core/chronicle.ts`, `src/core/turn.ts` (one call site), `src/core/data-loader.ts` (start snapshot in `newGame`), new `tests/core/chronicle.spec.ts` |
| WP2 Reveal model | Engine | Presidency Score, achievements catalogue and predicates, moments selection, perception text, declassified, truth rows | new `src/core/reveal.ts`, `src/core/achievements.ts`, `src/core/reveal-text.ts`, `tests/core/reveal.spec.ts`, `tests/core/achievements.spec.ts`, fixtures under `tests/fixtures/reveal/` |
| WP3 API and storage | Engine | `/reveal/:saveId`, `/runs`, seed code, AI tier note | `src/api/routes/game.ts`, `src/infra/db.ts`, `prisma/schema.prisma`, `tests/api/reveal.spec.ts`, `docs/API.md` |
| WP4 Reality content | Content Consultant | `reality` + `signature` for all 8 flashpoints x sides, schema extension | `data/flashpoints/*.json`, `FlashpointSchema` in `src/core/data-loader.ts` (coordinate with WP1: different function, merge order WP1 then WP4) |
| WP5 Benchmarks | Engine | `--benchmark` mode, generated files, freshness test | `scripts/simulate.ts`, `package.json` (script `bench:reveal`), `data/benchmarks/*.json`, `tests/core/benchmarks.spec.ts` |
| WP6 Reveal UI | Frontend | `RevealSequence` and stages 0 to 6, report view, store wiring | new `ui/src/components/reveal/*` (except files in WP7/WP9), new `ui/src/styles/reveal.css`, `ui/src/store/gameStore.ts` (RevealPayload types, `fetchReveal`, `seed` on `NewGameRequest`), `ui/src/components/EndScreen.tsx` (host the sequence; keep all current actions) |
| WP7 Ranking, replay, compare | Frontend | local run history, ladder, stage 7, compare overlay, "Play this seed" on title | new `ui/src/lib/runs.ts`, `ui/src/components/reveal/RankStage.tsx`, `CompareRuns.tsx`, `RunHistory.tsx`, `ui/src/components/TitleScreen.tsx` (seed entry, "Your record" link) |
| WP8 Share cards | Frontend | extract and redesign `drawCard`, portrait card, text share | new `ui/src/lib/shareCard.ts`, `ShareBar.tsx` in reveal folder (EndScreen only swaps its import; WP6 does that line) |
| WP9 Seals and stage art | Art Director | Seal SVG system (4 rarity rings, infamy variant, locked), verdict stamp, declassified redaction, rarity tokens | `ui/src/components/reveal/Seal.tsx`, `VerdictStamp.tsx`, `ui/src/styles/wc.css` (tokens block only), optional new scene `ui/src/scenes/art/Reveal*.tsx` per `STYLE.md` |
| WP10 QA | QA | End-of-session scenario per archetype, fast-forward helper, criteria 1 to 23 | `devloop/kit/` playtest driver (fast-forward), QA scenarios |

Order of merge: WP1, WP4 schema line, WP2, WP3, WP5 (needs WP2), then WP6 to WP9 in any order. The legacy `EndGameReport.tsx` stays and moves into the report view as the "World timeline" section.

## 7. Risks and open questions

- Benchmark staleness: rarity and percentiles go stale with balance changes. Mitigation: `benchmarks.spec.ts` fails if a seat file is older than the latest change to `src/core/` balance constants (hash stored in the file).
- LLM tiers break replay determinism: flagged on the button and in `replay.deterministic`.
- Hand-authored reality copy ages: `asOf` is shown; the Content Consultant reviews it each scenario update.
- Should the Presidency Score replace the leadership score on the HUD? No: keep the HUD meter (Dan's audit complaint is addressed separately by the score-explanation workstream); the Presidency Score exists only at the end.
