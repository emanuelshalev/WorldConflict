# QA verify: iteration 2 integrated build

QA Engineer, 2026-11-22. Build under test: `dev/rc1-synthetic-loop` at 5ef3ead (merges: learning aids, ease of play, historical plausibility, trust, era maps, cleanup). HEAD moved to 271e377 during the run (devloop docs only, no code or data change). The shared dev servers (8080/5173) serve the working tree, which during the run held an uncommitted, partial resolution of the benchmark conflicts described in S1-1 (someone else's edit, not mine); everything else matches HEAD.

Evidence is in `/tmp/claude-1000/-home-emanuel-git-WorldConflict/560a71e3-7113-4ffa-aea8-74191a508a8c/scratchpad/qa2/` (`*.log`, `orders/`, `orders2/` (patched scenario), `ux/`, `worldmap/`, `smoke-*`, `finish-*`, `drv1440/` (manual play), `ac3/`, `ac3-laptop/`, `meas-*.json` (idle, fonts, targets), `reg/` (regression sweep), `scripts/`).

## Verdict

**Not ready for the panel as committed: two S1s.** The UI work itself is in good shape: both smokes, the reveal fast-forward on laptop and phone, the ux-ease checks, 19 of 20 world map criteria, 26 of 27 orders criteria (one stale script check, verified by hand) and the regression sweep pass, and the two iteration 1 S2s are fixed. The blockers are a committed merge accident and a removed playable nation:

- **S1-1** 63 committed files carry git conflict markers (62 in `data/benchmarks/`, plus the iteration 1 backlog). `npm run test` is red (3 tests) and the reveal has lost achievement rarity (every seal reads "rarity not measured yet") and, at HEAD, the ranking ladder for every seat.
- **S1-2** West Bank (PSX) can no longer be played in any era, 2025 and 2026 included. It was playable in v0.9.0 and iteration 1, and no decision covers removing it.

Once S1-1 is resolved (keep the `cleanup-2` side, then run the benchmark test) and S1-2 is restored or signed off in the ledger, the build can go to the panel. Brief the panel on S2-1 if it is not fixed first.

## Gate

| Check | Result |
|---|---|
| `npm run test` | **FAIL**: 55 files, 513 tests, 3 failed, all in `tests/core/benchmarks.spec.ts` (`SyntaxError: Expected double-quoted property name in JSON`; conflict markers, S1-1). Re-run at the end on the working tree: still 1 failing (14 files still had markers, `achievements.json` among them) |
| `npm run lint` (biome) | PASS: 0 errors, 8 warnings, 2 infos (same as iteration 1) |
| `cd ui && npm run lint` | PASS |
| Build (`tsc --noEmit` backend, `vite build` to the scratch folder) | PASS. Main chunk 648 kB, React 384 kB, maplibre 1,023 kB on demand; no chunk warning (B-22) |
| Smoke 1440 (`smoke.mjs`, qa-laptop) | PASS, 3 months, no page errors |
| Smoke 390 (`smoke.mjs`, qa-phone) | PASS, 3 months, no page errors |
| Reveal fast-forward (`finish-flashpoint.mjs`) laptop and phone | PASS: reveal opens after 12 months, all stages and the report render, no page errors |
| Orders QA (`scenarios-qa/orders.mjs`) | 20 PASS, 3 MANUAL, 4 NOT RUN, errors FAIL: the script still drives a native `select` that the country picker replaced. A patched copy (`scripts/sq/orders-patched.mjs`) gives AC4, AC21, AC22 PASS; AC1 verified by hand in the game |
| World map QA (`scenarios-qa/worldmap.mjs`) | 19 PASS, 1 FAIL (AC3, cause below) |
| ux-ease shots (`runs/iter-02/ux-ease-shots.mjs`) phone, tablet, laptop | 30 PASS, 1 FAIL ("a tap on the map sets the target"): false fail, the script taps (513, 585), which is now ocean after the W2 camera change; a tap on Mexico land (497, 445) picks Mexico and returns to the desk aimed at it (`drv1440/014-picked.png`) |
| Manual play with the driver (1440) | Title, briefing, familiarity question, learning aids at all three levels, month 1, Map mode, map pick, result card, paper, month 2; 0 page errors, 0 native dialogs |
| Idle CPU on the desk (10 to 20 s window) | 1440: 1.47 s main thread per 10 s, 1,201 layouts, 177 running animations at 10 s, 0 at 20 s. 1024: 1.51 s. 390: 0.67 s. Unchanged from iteration 1 (1.65 s at 1440): the hero still animates for about 15 to 20 s, then the desk is still (Feel AC24 still fails the strict 10 s bound) |
| Balance harness (`npm run sim`) | Not run this round |

## Triage decisions (iteration 1)

| ID | Decision | Result | Evidence |
|---|---|---|---|
| F-01-1 | Tap-friendly country picker shared by desk and map | PASS | Flags, search ("ira" + Enter picks Iran), rows 48 px at 390/1024/1440, relation chip in words, Pick on the map works (banner, tap, back on the desk), same picker in the dossier (`CountryDetailPanel`). There is no way to go back to "no target" once picked (minor, the old select had it) |
| F-01-2 | Ending never contradicts play | PASS with a caveat | `tests/core/consistency.spec.ts` (9 cases). Reveal: verdict "Mission failed: Israel stays on side by 3.2" matches the truth table and the share card; "Better than 28% of simulated leaders" replaces "Top 100%". Caveat: The moments still pair moments with unrelated numbers (S2-1) |
| F-01-3 | Single source for numbers, correct attribution | PARTIAL | Numbers agree (HUD stability 57, paper +1.1, card 56 to 57; `tests/ui-numbers.spec.ts`). Attribution still wrong on the result card when the highlight is a war move (S2-1) |
| F-01-4 | Progressive disclosure in month 1, short briefing, varied result card | PASS | Briefing shows 3 goals plus "All goals (7)"; month 1 Focus view shows the crisis and Execute, the rest behind "Show the whole desk"; result card art follows what happened (war room for a front move, handshake for Muscat) |
| F-01-5 | Learning aids | PASS (D-53 layout) | See the learning aids table |
| F-01-6 | Magnitudes on cards, Big move | PARTIAL | "How much?" on every option and order card. Big move not seen in play (it needs 3+ unspent seals); unit test `tests/ui-ease.spec.ts` |
| F-01-7 | Era filter, non-existent states | PASS, but see S1-2 | `tests/core/era-filter.spec.ts`; API refuses 1960 UKR, 1990 BLR, 1960 ARE with a reason. The same rule also removed West Bank in 2025 and 2026 (S1-2) |
| F-01-8 | Late months | Next iteration | Not in scope |
| other S2 | Staff re-suggests Mobilize at 100% | PASS (unit) | `FULLY_MOBILIZED` refusal, `tests/core/mission-advice.spec.ts` |
| other S2 | Side picker label stale | PASS | Selecting Iran reads "Take office as Iran"; Next crisis (Quarantine) reads "Take office as Taiwan" |

## Iteration 1 QA findings

| ID | Result | Evidence |
|---|---|---|
| S2-1 Map-mode advisors unreadable | FIXED | The strip has its own advisor row: 703 px rows at 1440, 495 px at 1024, names and Added/Remove readable (`drv1440/008-map.png`). Side effect: the strip grew 58 px, see world map AC3 |
| S2-2 Mission tags contradict advice | FIXED | Tags are now honest trade-offs: "Cabinet pick · best trade-off: helps The shooting stops, costs Voters stay on side" next to "Hurts: approval 56%+"; month 2 "Strike the facilities" is "best for Iran never tests a bomb and Voters stay on side, costs The shooting stops" |
| S3-1 Art does not match the choice | FIXED | "More escorts, no strikes" shows the convoy, not the airstrike; result card and paper show the same scene |
| S3-2 Idle cost while the hero animates | OPEN | Unchanged numbers, see Gate |
| S3-3 1024 HUD hides four resources | FIXED | All seven indicators at 1024 (ux check, tablet screenshots) |
| S3-4 Coach step 2 not attached | PARTIAL | Step 1 sits on the hero, step 3 points at Execute; step 2 was not shown in this run |
| S3-5 Result card footer clipped at 1024 | FIXED | Next month bottom at 583 of 768 |
| S3-6 "Leadership score" in the reveal | FIXED | Not in the reveal or report; it only survives in staff "why" strings, and `advisorRows.ts` rewrites it |
| S3-7 Reveal series start after month 1 | NV | |
| S3-8 Text under 13 px, targets under 44 px | OPEN | 1440: 13 small-text elements (Map/Desk 12 px, scene bug 10.5 px, context map names 9 px, "1 name" chip 12 px), 19 targets under 44 px (Map 69x28, Desk 75x28, HUD icons 40x40). 1024: 11 and 9. 390: 4 and 2 |
| S3-9 Advisors two scrolls down on phone | SUPERSEDED | Month 1 Focus view puts advisors behind "Show the whole desk" by design |
| S3-10 Delta colours | NV | |
| S4 title labels behind the left column | OPEN | Morocco under "or don't"; a far-side rim marker now sits on the headline (`drv1440/001-title.png`) |
| S4 YOUR PICK stamp | PARTIAL | No longer covers the Hurts text; still covers the "free" chip |
| S4 share card "Top 100%" | FIXED | |
| S4 reveal month strip "black the fall" on a time-up failure | OPEN | Last month still black with "black the fall" on a time-up mission failure |
| S4 QA tooling | PARTIAL | AC18 is now MANUAL instead of a false fail; new stale selectors listed under S4 below |

## Learning aids (design-learn.md section 12 as changed by D-53)

| AC | Result | Evidence |
|---|---|---|
| 1 Familiarity question once, Some help preselected | PASS | Shown under the briefing before month 1 |
| 2/3 Underlines only in Guide me, for unmet names; none at Some help or I know this | PASS | Some help: clean text with "i 1 name" after the paragraph; Guide me: dotted marks on Congress, Bandar Abbas, convoys (`drv1440/007-guide.png`) |
| 5/6 Peek on tap, never hover only, away from options and Execute | PASS | Tap on "i 1 name" opens "The US Congress" above the paragraph, clear of the option cards and Execute (`drv1440/004-peek.png`) |
| 9 "As of" and source count | PASS | "As of Nov 2026 · 1 source" |
| 11 Situation briefing | PASS | Line, map, who is who with YOU, why it matters, timeline (`drv1440/005-situation.png`). The map legend says "OMN" instead of Oman (S4) |
| 12 Auto-open only in Guide me | PASS | Switching to Guide me opened the briefing; it never opened at Some help |
| D-53 big labelled button and 44 px "i" | PASS | "What is going on here?" on every crisis; the "i" chip is 28 px tall but carries a 44 px hit area (`learn.css:61`) |
| D-53 no unlock toast | PASS | None in 2 months; codex counter reads "18 met" |
| 13 to 22 | NV in the browser | Unit coverage: `tests/ui-learn*.spec.ts`, `tests/ui-codex-*.spec.ts`, `tests/codex/*` pass |
| 23 to 25 | PASS | In `npm run test` |

## World map (design-worldmap.md section 6)

19 of 20 PASS: fit and resize (AC1, AC2), pins in the free box, no phone scroll, names 13 px or more, 0 label overlaps in all eras and widths, no anachronistic names, one `setData` per era change, era switch fills, pins and key, 1960 blocs and era shapes (B-24), fronts and pins, hover and long-press, Flashpoint mode, card actions, era switch under 1 s at 58 fps with no requests, reduced motion 188 ms, idle 0 repaints, B-17 refusals.

**AC3 FAIL: in-game globe 876 px at 1920 (needs 900). Cause:** the globe fits correctly to the free box it measures. `gameInsets()` (`ui/src/lib/globeFit.ts:44`) sizes it as min(freeW x 0.98, freeH x 1.02). At 1920x1080 the map container runs from 58 to 925 px and the HUD covers it to 69, so freeH = 856 and D = 873 (measured 876). The command strip is 127 px tall (925 to 1052) plus the 28 px ticker. The strip became two rows in the ease-of-play merge (`ui/src/styles/ease.css:47`, `grid-template-areas: 'chips act' 'adv adv'`, the QA S2-1 fix: chips 44 px plus an advisor row of 58 px plus an 8 px gap). The W2 branch (c769537) was cut from e0e42bc, before that merge, so its "928 px" was measured against the one-row strip. Neither branch is wrong on its own; the merge took about 52 px from the globe. A second flaw goes the other way: `gameInsets` counts only `.hud`, not the goal line under it (69 to 122 px). So the top 50 px or so of the disc is drawn under the goal line, at 1440 as well (`ac3/001-ac3-m1.png`, `drv1440/008-map.png`). Counting the goal line correctly would drop D at 1920 to about 822. Options: collapse the advisor row by default on desktop after month 1 (the strip already has a "Your advisors suggest" toggle) or let the globe run under a translucent strip, add the goal line to the insets, and then re-measure AC3 or relax it to a value the stacked chrome allows.

## Orders (design-orders.md section 10)

AC2, 3, 5 to 13, 15, 17, 19, 20, 23 to 27 PASS from the scenario. AC4, 21 (19 vs 19 orders), 22 (same cost, chance, reason) PASS with the patched script. AC1 PASS by hand: in the game "Target: choose a country" and every targeted card shows "Pick a country first." with a "Pick a country" button (`ux/laptop/004-catalog.png`; the gallery no longer has a no-target state to test). AC14 and AC18 MANUAL: Execute was never disabled; HUD and rail seals agree (1 full). AC16 is in `npm test`.

## Backlog items marked Done

| ID | Check | Result |
|---|---|---|
| B-20 | Objective reads "Voters stay on side" in the briefing, goal line, tags | PASS |
| B-21 | Codex re-reads changed data in dev | PASS (unit, `tests/api/codex.spec.ts`) |
| B-22 | Main chunk 648 kB, no build warning | PASS |
| B-24 | DDR and South Yemen drawn | PASS (world map AC11 "era shapes drawn") |
| B-25 | No Algeria clash in 1960 | PASS (AC8, `tests/core/era-content.spec.ts`) |
| B-26 | Era situation opens the codex | PASS: One Term 2026, situation 1, "What is going on here?" opens "Ceasefire or collapse: Ukraine, November 2026" with who is who and what really happened |
| B-05, B-08 to B-13, B-16 (iteration 1) | Re-checked through the orders scenario (B-08 toast 3.9 s, B-09 confirm face), the title (B-12), the paper | PASS |
| B-07 | Desk goes still after 15 to 20 s | Unchanged, "mostly done" |
| Doc | `runs/iter-01/backlog.md` has committed conflict markers (lines 24 to 40, both B-20..B-26 tables). B-18 and B-19 are fixed in 0300b55 but still read Open | Fix the file |

## Regressions versus v0.9.0 and iteration 1

Checked: Flashpoint, One Term and Legacy start and reach the desk; Cabinet, World, Chronicle and Settings drawers; Menu (Resume, Main menu); Full desk with All orders; Map mode, layers, map orders; Saved games with Resume loading a playable save; `#scenes`, `#clip`, `#mapfx`, `#orders`, `#reveal-demo`; the reveal through to the report; no UI file deleted; no API route removed. The six parallel merges into the desk, title screen, result card and map resolved at the import level only (`git show --cc`) and none of their features was lost: the title holds the learning aids, the side defaults and the era globe; the result card holds the single-source numbers and the varied art; the map holds the fit, Whole world and the advisor row. The only clash between merges is the strip height against the globe fit (AC3).

Lost capabilities: S1-1 (achievement rarity and the ranking ladder in the reveal) and S1-2 (West Bank as a playable nation).

## Bugs

### S1

**S1-1 Merge conflict markers committed in the reveal benchmarks.** `git grep -l '^<<<<<<< ' HEAD` lists 63 files: 62 in `data/benchmarks/` (every seat file and `achievements.json`, e.g. `data/benchmarks/2026_TERM_AFG.json:3`, two `fingerprint` lines between `<<<<<<< HEAD` and `>>>>>>> cleanup-2`) and `devloop/instances/world-conflict/runs/iter-01/backlog.md:24`. They came in with the cleanup merge 5ef3ead. Effects: `npm run test` fails 3 benchmark tests. `loadSeatBenchmark` / `loadAchievementRarity` (`src/infra/benchmarks.ts:70`) catch the parse error and return null, so the reveal silently drops achievement rarity: every seal reads "rarity not measured yet" (`finish-laptop/002-reveal-1.png`; iteration 1 showed "earned by N%"). At HEAD it also drops the ranking ladder and percentile for every seat. The ladder showed for Hormuz USA only because that file was already fixed in the uncommitted working tree. Repro: `npx vitest run tests/core/benchmarks.spec.ts`; play any Flashpoint to the end and open Achievements. Fix: keep the `cleanup-2` fingerprint (`4ab6d4d644e5fcf5`, what the working-tree edits are doing), commit, re-run the benchmark test, and add a repo check that fails on conflict markers (`tests/repo-style.spec.ts` already scans tracked files for em dashes).

**S1-2 West Bank is no longer playable in any era.** `POST /api/new-game {"scenarioId":"2026","playerCountryId":"PSX","mode":"TERM"}` returns 400 "West Bank is not independent in 2026...". The same happens for 2025, 1990 and 1960. In 1960 Nigeria (`NGA`, NOT_INDEPENDENT until October) is now unplayable too. Cause: 1a75790 (B-17) makes every `eraStatus` entry marked PART_OF or NOT_INDEPENDENT unplayable, and the W4 era data marks PSX NOT_INDEPENDENT in every scenario. 210db4a then deleted `data/benchmarks/2026_TERM_PSX.json`. B-17 named 1960 PSX only, and design-worldmap.md line 170 says PSX "stays playable: rule 'never remove'". This removes a v0.9.0 seat. Owner: product decision (ledger), then engine (restore 2025 and 2026 PSX, or record the removal and the reason in the ledger and GAMEPLAY).

### S2

**S2-1 Wrong attribution on the result card and in The moments (F-01-3 not closed).** Repro: Hormuz Convoy as United States, month 1, pick "More escorts, no strikes" (effects: approval -3, mobilization +5, growth -0.3), Execute. The result card reads "WHAT YOUR CHOICE DID · Your forces gain ground against Iran", with "IT WORKED +5 Front (your side)" (`drv1440/010-m1-result.png`). When the month's highlight is a war move (`report.highlight.ref === 'war'`, `ui/src/lib/debrief.ts:214`), the card keeps the "What your choice did" kicker and an "It worked" verdict for a front move the player did not order (`ui/src/scenes/ResultCard.tsx:155`). The reveal's moments make the same mistake (`finish-laptop/003-reveal-2.png`): under What went badly, "Israel stays on side: Objective slipped, stability 59% to 66%", "Voters stay on side: Objective slipped, tension 52 to 46", "Isfahan's tunnels: Watch and wait, tension 52 to 46"; under What went well, "Foreign interference: Counter-intelligence sweep, score 100 to 99". Each moment cites a number that moved the other way or has nothing to do with it. Owner: month WP-H (result card kicker for war highlights), engine `reveal.ts` (moment facts should use the objective's own metric).

### S3

- **S3-1 In-game globe at 1920 is 876 px (world map AC3), and its top hides under the goal line at every width.** Cause and options in the world map section.
- **S3-2 Mission and cabinet tags above option cards are clipped at 1024.** Month 2 card 1: the five-line "Best for your mission · helps Iran never tests a bomb and Voters stay on side, costs The shooting stops" tag rises behind the advisor panel and its first lines are hidden. Month 1 card 3: the tag starts mid-sentence ("trade-off: helps..."). `ux/t-m2-crop.png`, `ux/tablet/003-m1-desk.png`.
- **S3-3 Map mode at 1024: the command strip takes about 230 px** (chips wrap to two rows, then the advisor row), leaving the globe about half the screen (`ux/tablet/008-map.png`).
- **S3-4 Idle hero, legibility and targets (iteration 1 S3-2, S3-8) unchanged.** Numbers in the Gate and the findings table.

### S4

- HUD leader name truncated to "D..." / "Unit..." at 1440 once Stability and Legitimacy show their deltas (`drv1440/013-pick.png`).
- Situation briefing map legend shows the code "OMN" (`drv1440/005-situation.png`).
- Phone month 2: the "Cabinet pick: Commit logistics and money" pill reaches the right edge (`ux/phone/010-m2-desk.png`).
- Title: far-side rim marker drawn over the "Put it out, or don't." headline at 1440 (`drv1440/001-title.png`).
- The YOUR PICK stamp covers the "free" chip; the reveal month strip still paints "black the fall" on a time-up failure.
- The country picker cannot be cleared back to "no target".
- QA tooling: `scenarios-qa/orders.mjs` lines 169, 198, 267 use `selectOption` on the removed native select (use `[data-country-picker]` then `.cp-row[data-country=IND]`, as in `scratchpad/qa2/scripts/sq/orders-patched.mjs`); the AC1 step has no no-target state left in the `#orders` gallery. `runs/iter-02/ux-ease-shots.mjs` taps (513, 585) for Mexico, which is ocean since the W2 camera; take the point from `__wcMap.project()` instead. `finish-flashpoint.mjs` still misses the verdict screenshot (the count stage advances by itself).
