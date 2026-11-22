# QA verify: iteration 1 integrated build

QA Engineer, 2026-11-22. Build under test: `dev/rc1-synthetic-loop` at e0e42bc (merges since 1a7fc04: feel, month, orders, reveal, codex base, era content, world map base). During the run HEAD moved to 3e7ee39 (codex content, B-16 midterm premises fixed in `data/flashpoints/`). `ui/src` and `src` did not change between the two, so the UI findings hold for 3e7ee39. Tests and lint were re-run on 3e7ee39.

Evidence (screenshots, logs, JSON) is in the scratch folder `/tmp/claude-1000/-home-emanuel-git-WorldConflict/560a71e3-7113-4ffa-aea8-74191a508a8c/scratchpad/qa1/` (`smoke-*`, `orders/`, `drv1440/`, `drv1024/`, `drv390/`, `finish-*`, `meas-*.json`, `idle-laptop/`, `map-*`, `reg*/`, `gal/`, `mo*/`, `sheets/`).

## Gate

| Check | Result |
|---|---|
| `npm run test` | PASS: 44 files, 392 tests (glossary, parity, availability, repetition, reveal, achievements, benchmarks, determinism included) |
| `npm run lint` (biome) | PASS: 0 errors, 8 warnings, 2 infos |
| `cd ui && npm run lint` | PASS |
| `npm run build` | PASS (tsc and vite) |
| Smoke 1440 (`smoke.mjs`, qa-laptop) | PASS, 3 months, no page errors |
| Smoke 390 (`smoke.mjs`, qa-phone) | PASS, 3 months, no page errors |
| Orders QA (`scenarios-qa/orders.mjs`) | 24 PASS, 2 MANUAL, 1 FAIL (AC18, a false fail of the script, see below) |
| Reveal fast-forward (`finish-flashpoint.mjs`) laptop and phone | PASS: reveal opens after 12 months, all stages and the report render, no page errors |
| Manual play with the driver | 3 months at 1440, 3 months at 1024, 2 months plus the paper at 390; 0 page errors, 0 native dialogs |
| Regression sweep vs v0.9.0 | No lost capability found |

## Backlog items marked fixed

The backlog file still lists B-05 and B-08 to B-13 as "Open"; their status should be updated. All seven were reproduced against the original repro and now pass.

| ID | Check | Result |
|---|---|---|
| B-05 | No `PENDING` string in `ui/src`; `tests/ui-glossary.spec.ts` passes | PASS |
| B-08 | Network failure toast reads "Failed to fetch ×2" (deduped) and is gone after 3.9 s (orders AC9) | PASS |
| B-09 | Enter on an irreversible search hit opens the confirm face focused on "Keep the peace"; a second Enter cancels; Enter on an invalid hit queues nothing (orders AC25) | PASS |
| B-10 | Paper lede now reads: In the crisis "The midterm clock", President Trump decided: More escorts, no strikes. No "on After the" prose seen in 8 months of play | PASS |
| B-11 | Month 1 at 1440: HUD 74, result card 78 to 74, paper "World tension 74 of 100". At 1024 month 2: card 83 to 80, debrief tile 80.0 | PASS |
| B-12 | Title preselects TODAY's crisis (Hormuz Convoy, gold TODAY pin, United States side) | PASS |
| B-13 | Read the paper from the result card, then Escape: paper closes back to the desk (1440 and 390) | PASS |
| B-07 (in progress) | Desk goes still after about 15 to 20 s: 0 running animations, 0 layouts and 0.001 s of main-thread work per 10 s. Hero still costs 3.5 s per 10 s while it animates (see Feel AC24) | Mostly fixed |
| B-16 (bonus) | Fixed in 6e50c82 during the run ("The January clock" now reads correctly) | PASS |

## CEO goals at a glance

| Goal | Visibly addressed? | Note |
|---|---|---|
| G1 never blocked without a reason | Yes | Reasons and fixes on cards before any tap, on every surface; 0 predictable refusals at Execute over 18 orders |
| G2 point at what you mean | Yes | Capital pointed in about 10 ms with a callout naming the order and its cost; tray slots light |
| G3 one vocabulary | Mostly | Glossary test in CI; full words in the HUD at 1440. Gaps: the 1024 HUD hides four labels behind "More"; the reveal still says "Average leadership score" |
| G4 clear what is expected | Partly | Goal line, Your move card, mission sheet, coach, 2-line briefing all work. Mission tags give contradictory advice (S2-2) |
| G5 suggestions visible and good | Desk yes, map no | Advisors block with Why lines and one-tap Add on the desk. In Map mode the advisor strip is broken (S2-1) |
| G6 desk and map parity | Yes | 19 vs 19 orders per target, identical cost, chance and reason text |
| G7 a game, not a dashboard | Yes | Illustrated cards, wax seals, YOUR PICK and APPROVED stamps, stingers, sound toggle. Art does not always match the choice (S3) |
| G10 the reveal | Yes | Staged reveal (count, verdict, achievements, moments, perception, numbers, truth, ranking), report, replay with seed, share card |

## Acceptance criteria

Legend: PASS, FAIL, PARTIAL, NOT BUILT, NV (built but not verified in this run).

### design-orders.md section 10

| AC | Result | Evidence |
|---|---|---|
| 1 Pick a country first, picker pulses | PASS | 19 targeted cards at 1440 and 1024 |
| 2 Needs ◆ 2, you have ◆ 1, refill shown before tap, every surface | PASS | desk tile, row, search, map, dossier |
| 3 Unaffordable tap adds nothing, no toast | PASS | tray 2 to 2, 0 toasts |
| 4 Six queued: limit reason, points at Orders this month | PASS | 17 of 23 cards (6 keep their own rule) |
| 5 Queued shows In this month with Remove | PASS | states, rows, map |
| 6 Nuclear strike outside war: "Only in wartime." | PASS | 1440, 1024, 390 |
| 7 No predictable refusal at Execute | PASS | 18 orders over 3 months via API; manual play showed none |
| 8 No native dialogs | PASS | gallery, game and 8 manual months |
| 9 Toast only for network errors, gone in 6 s, deduped | PASS | 3.9 s, "×2" |
| 10 Unavailable cards reachable by Tab with reason in name | PASS | |
| 11 Capital pointed within 100 ms, callout | PASS | 9 to 11 ms |
| 12 Freeing tray slot highlighted | PASS | |
| 13 Add pulses slot and meter | PASS | |
| 14 Disabled Execute reason points at the meter | NV | script MANUAL; not reproduced in play (Execute was never disabled) |
| 15 Reduced motion: static ring | PASS | |
| 16 Glossary test in `npm test` | PASS | |
| 17 1024 HUD shows all seven full words | FAIL at 1024 | 1024 HUD shows Approval, Stability, Political capital; Legitimacy, Economy, World tension, Score sit behind "More". 1440 PASS. The script only checks 1440 |
| 18 HUD and rail capital meters agree | PASS (script false FAIL) | HUD 1 full seal, rail 1 full seal, text "1 left". The script counts every `[data-point="capital"]` with width > 0, which includes an advisor Add button (`adv-add is-off`, below the fold) that carries `data-point="capital"` but no seals. Fix the selector in `scenarios-qa/orders.mjs` line 341 |
| 19 Banned strings absent | PASS in game | The reveal still shows "Average leadership score 109" (see S3-6) |
| 20 Political capital explainer | PASS | |
| 21 Map list equals desk catalog | PASS | 19 vs 19 |
| 22 Same cost, share, chance, reason | PASS | |
| 23 Queue from map keeps menu open, stamp, in tray | PASS | |
| 24 Same preview on map | PASS | |
| 25 Enter on Declare war opens confirm face | PASS | |
| 26 1.2 s hold for nuclear | PASS | 0.5 s cancels, 1.45 s authorizes |
| 27 Mission warning on confirm face once, amber | PASS | |

### design-month.md section 11

| AC | Result | Evidence |
|---|---|---|
| 1 Goal line visible at 390/1024/1440, "n of m on track · month t of T", no bare "2/4" | PASS | Flashpoint. Term and Legacy show "Win the coming election  Month 1 of 48" without segments (no primary objectives to count) |
| 2 No horizontal scroll at 390 | PASS | scrollWidth 390 |
| 3 Mission sheet within 300 ms, now/need/state, Helps now | PASS | 93 ms; every objective has Helps now items |
| 4 Helps now item focuses or queues | NV | |
| 5 Objective now equals HUD, Last month delta | PASS | stability 57 to 62 on card, HUD 62 |
| 6 Exactly one Your move card on top | PASS | |
| 7 At most two effects in words, one mission tag | PASS | two chips plus "+N more" |
| 8 Bab al-Mandab SAU month 1 tags | NV | not played this run |
| 9 Badge never "Your call"; "Your pick: X" / "Approved" | PASS | "Your pick: More escorts, no strikes"; plan slot agrees |
| 10 Cabinet-hurts note with one-tap switch | PARTIAL | Note and switch work, but the switch target hurts the same objective (S2-2) |
| 11 ANALYST cabinet pick never Hurts | NV | |
| 12 Two advisor suggestions visible (1440 no scroll, 390 one scroll, also in Map mode) | FAIL | 1440 desk PASS (heading at 742 px, both cards partly visible). 390: heading at 1535 px in an 844 px viewport, two scrolls. Map mode: unreadable (S2-1) |
| 13 Add in one tap, reads Added; unaffordable reason on the button | PASS | "Needs ◆ 2, you have ◆ 1." on Reform program |
| 14 Staff never repeat an order type two months running | PASS (3 months) | m1 address + UAE, m2 reform, m3 address + UAE |
| 15 Briefing: no repeated sentence, at most 2 lines, Full briefing | PASS | 0 duplicates at 1440/1024/390 |
| 16 Coach: one bubble, attached to what it names, advances on action | FAIL | One bubble at a time and it advances, but step 2 "Your advisors added these" sits over option card 3 and hides its text instead of pointing at the advisors list (S3-4) |
| 17 Panel 30 s check | Panel | |
| 18 Single result card, 2 to 3 deltas, mission, score line, Next month | PASS | Footer clipped at 1024x768 in month 1 (S3-5) |
| 19 Debrief tabs switch on one tap at 390 | PASS | Diplomacy tab in the driver |
| 20 See everything and Read the paper reachable, each with Next month in view | PASS | |
| 21 Follow-up timing on the result card | NV | |
| 22 Why your score moved, four components, named terms | PARTIAL | HUD sheet lists Economy, Security, Approval, Standing; result card names terms ("standing lifts it (12 defence pacts)"). Sum check not done |
| 23 Dan's PAK war named | NV | |
| 24 No repeated reaction line | PASS (unit) | `tests/core/repetition.spec.ts`; none seen in play |
| 25 Repeated order card collapses | NV | |
| 26 `--policy staff` in harness | Built | `scripts/simulate.ts` has `staff` and `staffswitch`; bands not re-run here |
| 27 125% zoom at 1024, targets 44 px | FAIL | targets under 44 px at 1024 (see Feel AC23) |

### design-feel.md section 10

| AC | Result | Evidence |
|---|---|---|
| 1 Hero full column width, 200 px or more | PASS | 1440 hero 1017x200 |
| 2 Gap under navigation 48 px or less | NV | |
| 3 Coach dismiss moves no card | NV | |
| 4 No horizontal scroll at 390 | PASS | |
| 5 Every card illustrated, titles never ellipsized | PASS | 3 of 3 cards with `.scene`, 0 ellipsized titles |
| 6 Press transform within 100 ms | NV | visible in the Feel gallery |
| 7 YOUR PICK and APPROVED stamps, plan slot repeats | PASS | |
| 8 Reason inside the card, shake on press | PARTIAL | reason PASS; shake not measured |
| 9 Ghost with Undo | PASS (gallery) | |
| 10 Seals everywhere, HUD full seals equal text | PASS | |
| 11 "Political capital" in HUD and rail, no CAP/APPR/STAB | PASS | |
| 12 Seal becomes an imprint on queue, Undo reverses | PARTIAL | meter pulse confirmed (orders AC13); imprint timing not measured |
| 13 Sound toggle 44x44 in HUD at all widths, Settings section, persists | PARTIAL | Toggle present at 1440/1024/390; Settings Sound section and AudioContext check NV |
| 14 sound.play per action | NV | |
| 15 Reduced motion | PASS | orders AC15; stingers still show with reduced motion |
| 16 War stinger, role alert within 300 ms, gone within 2.8 s, skips on key | PASS (gallery) | shown in 5 ms, gone at 2.38 s, key skips |
| 17 One stinger per Execute | NV | priority list in `ui/src/lib/moments.ts` |
| 18 Nuclear, Regime change, Ceasefire, Mission complete titles | PASS (gallery) | Nuclear lasts 2.80 s, at the limit |
| 19 Diplomacy-keyword choices never get military art | FAIL | "More escorts, no strikes" shows the airstrike scene (S3-1) |
| 20 Failed order never green or summit | NV | |
| 21 Desk thumbnail and debrief scene match | FAIL | result card and paper show different scenes for the same decision (S3-1) |
| 22 No text below 13 px | FAIL | 13 elements at 1440: Map/Desk switch 12 px, Focus/Full desk 12 px, scene bug 10.5 px, Approve cabinet pick and Ask your staff 12.5 px, context map names 9 px, Shift+A 10 px, ticker 12 px |
| 23 Targets 44 px at 390 and 1024 | FAIL | 1024: Map 69x28, Desk 75x28, More 55x28, "+N more" 68x24, Hide 55x27, Menu 40x40. 390: More 40x28 |
| 24 Idle CPU: under 0.5 s per 10 s after 10 s idle; no running scene animations | FAIL (strict) | 1440, 10 s windows: 3.53 s (0 to 10 s, 176 parliament animations in the hero, 2353 layouts), 1.65 s (10 to 20 s), 0.125 s, 0.001 s. Goes still after about 15 to 20 s instead of 10 s |
| 25 At most 2 scenes animating | PASS | 2 at load, 1 at 10 s |
| 26 Globe labels avoid pins | NV | title screenshot shows no label-pin overlap around the Gulf |

### design-reveal.md section 5

| AC | Result | Evidence |
|---|---|---|
| 1 Reveal opens after the last month, stage rail with names (dots plus name at 390) | PASS | laptop and phone |
| 2 Next, Space/Right, Back, Skip to the report | PASS | ArrowRight driven; Back and Skip visible |
| 3 Reduced motion final states | NV | |
| 4 Verdict, grade, stars, Presidency Score parts sum | PASS | 300 + 0 + 154 + 104 = 558 |
| 5 Presidency Score formula unit test | PASS | `tests/core/reveal.spec.ts` |
| 6 Achievements: name, tier, month, earned by N%, infamy red and last, two locked hints, +N more | PASS | 10 earned, 1 infamy (Pariah), "+3 more", 2 locked |
| 7 Predicate unit tests | PASS | `tests/core/achievements.spec.ts`; the page footer says "34 seals in the catalogue" vs 37 in the spec |
| 8 Moments axis, 3 well, 3 badly, "Month N", timing callout | PASS | |
| 9 Approval curve, press quotes, relation rows, History's judgement | PASS | no ghost line (first run) |
| 10 Six series, start/end match chronicle | PARTIAL | Five charts plus counts. "start" is the value after month 1 (approval start 42 vs 44 at take-office, tension start 72 vs 78) (S3-7) |
| 11 Truth table 3 to 5 rows with chips, experts row, sources | PARTIAL | Declassified cards shown at 390; truth rows below the fold not inspected |
| 12 No foreign ground truth before game over | PASS (unit) | |
| 13 Ladder, percentile, last runs, beat-this line | PASS | "Beat 558 next time: Win first: The Gulf still trusts you" |
| 14 Replay same opening | PASS (unit) | button and seed code shown |
| 15 Same seed, same orders, same score | PASS (unit) | determinism spec |
| 16 Compare runs | NV | disabled on first run (correct) |
| 17 Run history survives reload, storage blocked | NV | |
| 18 Share card sizes | NV | card renders; PNG size not checked |
| 19 Old saves reduced reveal | NV | |
| 20 No horizontal scroll, text sizes | PASS at 390 (visual) | |
| 21 50 fps, one live SceneFrame | NV | |
| 22 No em dash | PASS | repo-style spec |
| 23 Panel | Panel | |

## Regressions versus v0.9.0

None found (no S1). Checked: Flashpoint, One Term and Legacy start and reach the desk; Saved games lists and Resume loads a Legacy save; Cabinet, World, Chronicle and Mission drawers; Settings with the three AI tiers; the Menu (Resume, Main menu); Full desk with the All orders catalog and search; Map mode with all seven layers; dossier and map orders (orders QA); `#scenes`, `#clip`, `#mapfx` galleries; no API route removed (four added); no UI file deleted.

## Bugs

### S1
None.

### S2

**S2-1 Map mode: the advisor strip is unreadable and overlaps controls (G5).**
Repro: new game, today's crisis (Hormuz Convoy, United States), Take office twice, press Map. At 1440x900 and 1024x768 the command strip shows the advisor rows squashed to 94 px (1440) and 18 px (1024) while their content is 172 px wide, so "CS", "FM", "Added", "Desk" and "Remove" draw on top of each other next to "Approve 4 picks". No suggestion name or Why line is readable, and the overflowing Added/Remove buttons sit over the Desk button. Screenshots: `map-laptop/001-map.png`, `drv1024/005-m3-map.png`. Owner: month WP-F (`CommandStrip` / `AdvisorList` compact).

**S2-2 Mission tags and the cabinet note give contradictory advice (G4, G5).**
Repro: Hormuz Convoy as United States, month 1 at 1440. Option 3 "Reply via Muscat" carries "Cabinet pick · good for your mission" and, on the same card, "Hurts: Approval of 56%+ after the midterms +1 more". Every option in months 1 to 3 carries a Hurts tag on a primary objective. Month 2 ("Iran nears the threshold"): "Strike the facilities" is tagged "Best for your mission" while it shows "Hurts: The shooting stops +2 more", and the note reads "Your cabinet backs Coordinate sanctions and talks, but it hurts The shooting stops. [Switch to Strike the facilities]". The switch target hurts the same objective and escalates the war the objective wants ended. Month 3 repeats the pattern ("Switch to Harden defenses", both hurt The shooting stops). Screenshots: `drv1440/003-m1-picked.png`, `drv1440/007-m1-after-esc.png`, `drv1440/009-m3-desk.png`. Owner: engine `missionImpact.ts` / `advisors.ts` (pick ranking), month WP-E (note copy).

### S3

- **S3-1 Art does not match the choice.** "More escorts, no strikes" shows the airstrike scene (jets, target reticle) on the desk thumbnail and the result card, because `/\bstrikes?\b/` in `ui/src/scenes/kinds.ts:221` matches "no strikes". "Hit the IRGC navy now" (an airstrike) gets the meeting room. The paper then shows the meeting room for the escorts decision, so result card and paper disagree. Repro: Hormuz USA month 1, pick option 2 or 1, Execute; compare result card, then Read the paper. `drv1440/005-m1-result.png`, `drv1440/006-m1-paper.png`, `drv1024/002-m1-result.png`.
- **S3-2 Idle cost while the hero animates.** For the first 15 to 20 s on the desk the parliament hero runs 176 CSS animations: 3.5 s main-thread per 10 s and about 235 layouts/s at 1440 (tablet 1.4 s, phone 0.6 s in the 10 to 20 s window). It then sleeps correctly. Feel AC24 asks for stillness after 10 s. `idle-laptop` windows above.
- **S3-3 1024 HUD hides four resources.** Legitimacy, Economy, World tension and Score are behind "More" at 1024x768 (orders AC17). `drv1024/001-m1.png`.
- **S3-4 Coach step 2 is not attached to its target.** "Your advisors added these. Keep them, or tap Add on another. Step 2 of 3" opens over option card 3 and hides its description, not over the advisors list. `drv1440/003-m1-picked.png`.
- **S3-5 Result card footer clipped at 1024x768 in month 1.** With the "Your mission bar moved" tip shown, See everything and Next month are cut off at the bottom of the card, so the player has to scroll inside it. `drv1024/002-m1-result.png` (month 2 without the tip is fine).
- **S3-6 "Leadership score" survives in the reveal.** Stage 1 and `#reveal-demo` read "LEADERSHIP 163 / 300 · Average leadership score 109 (x1.5)". B-15 is still open.
- **S3-7 Reveal series start after month 1.** "start 42%" approval, "start 72" tension, "start 57%" stability, while the player took office at 44 / 78 / 56. The chronicle has no take-office snapshot in the series (same family as B-14).
- **S3-8 Legibility and targets (feel AC22, AC23; month AC27).** Text below 13 px and controls below 44 px listed in the tables above.
- **S3-9 Advisors two scrolls down on phone.** The advisors heading is at 1535 px in an 844 px viewport; the fixed HUD, goal line and "This month" chip take about 225 px. `drv390/005-m1-s3.png`, `drv390/006-m1-s4.png`.
- **S3-10 Delta colours mean different things.** In the debrief tiles a tension drop (64.0, -7.0) is red. On the result card "Gaza: violence 42 to 38, -4" is red, while a tension drop is green on the same card. `drv1440/010-m3-debrief.png`, `drv1024/003-m2-result.png`.

### S4

- Title globe country labels show through the left column text (Morocco under "Pick a fire", Algeria and Libya under the Today card, France under the intro). `drv1440/001-title.png`.
- The YOUR PICK stamp covers the card's Hurts text; at 1024 the "Cabinet pick · good for your mission" tag covers the "free" chip; card 3 sits 12 px lower than cards 1 and 2 (title baselines differ).
- On phone the fixed "Next month" button overlaps the paper masthead. `drv390/011-m3-res.png`.
- Prose: "Your envoy spends the week in United Arab Emirates' capital" needs "the" (`withArticle`). `drv390/009-m1-deb2.png`.
- Share card reads "Top 100% of simulated leaders" next to "Better than 0%". The reveal month strip paints the last month black with "black the fall" on a time-up mission failure where nobody was deposed.
- The debrief "The month" page is half empty at 1440 (feel 8.4). `drv1440/010-m3-debrief.png`.
- QA tooling: `scenarios-qa/orders.mjs` AC18 selector catches the advisor Add button (false FAIL); AC17 is only checked at 1440. `finish-flashpoint.mjs` skips the verdict screenshot because the count stage auto-advances before the first ArrowRight.

## Verdict

**Ready for the customer panel, with two S2 caveats to brief the panel on or fix first.** The gate is green (tests, both lints, build, both smokes, reveal fast-forward on laptop and phone). The orders spec is effectively complete (26 of 27, and the one fail is a script error). Every backlog item marked fixed passes its repro, and nothing from v0.9.0 is lost. The two S2s are real experience problems, not crashes:

- S2-1: Map-mode advisors are unreadable at 1440 and 1024.
- S2-2: mission tags and the cabinet switch note sometimes recommend an option that hurts the objective they cite (the Hormuz USA seat, which is today's crisis and the default seat).

S2-2 will show up in the panel's first minutes, because the panel starts on today's crisis. If there is time, fix it before the panel; otherwise expect Ruth, Olivia and Dan to report it. The S3 list (art mismatch, 1024 HUD, legibility and targets, idle hero cost, coach placement) suits iteration 2.
