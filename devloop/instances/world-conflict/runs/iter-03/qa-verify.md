# QA verify: iteration 3 integrated build

QA Engineer, 2026-11-22. Build under test: `dev/rc1-synthetic-loop` at e260170 (code as of 9624de4: newcomers first, outcome truth, RS-004 way back, verify gate, seats and replay, RS-005 Recommended). HEAD moved to d70608a during the run (status page and progress files only, no code or data change). The shared dev servers (8080/5173) were used as they were; nothing was restarted. The full `npm run verify` gate passed at 9624de4 (597 tests, 83/83 finding guards, 20 visual baselines) and was not rerun. This round is a hand check in a real browser (`devloop/kit/driver.mjs`, port 7850) at laptop 1440x900 and phone 390x844, plus two small measurement scripts.

Evidence is in `/tmp/claude-1000/-home-emanuel-git-WorldConflict/560a71e3-7113-4ffa-aea8-74191a508a8c/scratchpad/qa3/`: `l/` (laptop driver, 001 to 039), `p/` (phone driver, 001 to 024, plus `rvhead-*.png`), `adv/`, `adv-phone/`, `adv-desktop/` (advisor card measurements), `scripts/advcard.mjs`, `scripts/rvhead.mjs`.

## Verdict

**Not ready for the panel as built: two S2s, one of them a regression of a registered finding.** No S1. Everything iteration 3 set out to do works in the browser: the way back from the reveal (RS-004), the Recommended group with a matching count next to every Accept control on desk, phone and Map mode (RS-005), Shift+A doing nothing on month 1's simple desk, both control seed codes from "Play a seed", What if seats, replay and branch, the month 1 goal sentence, and one status vocabulary. The blockers are two layout defects, both one-line CSS causes:

- **S2-1 (REGRESSED: RS-001-5, F-02-5)** "Your advisors suggest" on the desk is unreadable at every width from month 2 on (Focus and Full desk): order titles render one letter per line in 300 to 650 px tall cards.
- **S2-2 (new, side effect of the RS-004 fix)** On phones and narrow screens (up to 700 px) the reveal's new Main menu button lies on top of the sound button and the Skip link. Tapping "Skip" leaves the reveal for the title screen.

Both should be fixed before the customer round: S2-1 is on screen for every persona every month after the first, and S2-2 sends Maya and Noah (phone, reach the end) out of the reveal when they try to skip it. With them fixed (and the S2-1 guard extended to the desk), the build can go to the panel.

## Gate

| Check | Result |
|---|---|
| `npm run verify` (full gate) | PASS at 9624de4 (reported, not rerun): 597 tests, 83/83 finding guards, 20 visual baselines |
| Build under test vs gate | e260170 and d70608a add only devloop docs, the iteration 3 customer brief, control scenarios and progress files |
| Manual play, laptop 1440 | Title, Play a seed (both codes), briefing, month 1 Focus and Full desk, Recommended, Map mode, 12 months to the reveal, all reveal stages, report, Replay same opening, One Term 1960 What if, Saved games, branch from month 10. 0 page errors, 0 native dialogs |
| Manual play, phone 390 | Play a seed, month 1 simple desk, plan sheet, Accept all, Map mode Review, 12 months, staged reveal, report, Play again, a FAILED order. 0 page errors |
| Visual coverage gap | The 20 baselines hold the month 1 desk only (simple desk, no advisor list) and the reveal gallery at 1440 and 390 with no check for overlapping controls; neither defect below could show up there |

## Iteration 3 acceptance

### RS-004 a way back from the reveal

| Check | Result | Evidence |
|---|---|---|
| Main menu visible in every staged reveal stage | PASS at 1440; on phone it is visible but covers the sound button and Skip (S2-2) | `l/022-rv2.png`, `p/014-p-rv.png` |
| Report header: Play again, Replay same opening, Main menu | PASS laptop and phone | `l/025-rv-report.png`, `p/019-p-report2.png` |
| Report rail: Play again and Main menu pinned | PASS (1440) | `l/025-rv-report.png` |
| Replay same opening starts the same seat and seed | PASS: new save, `ceasefire-or-collapse` UKR, seed 37462537 (= CO-UKR-MAYA1) | `l/026-replay.png`, `/api/saves` |
| Play again starts the same seat with a new opening | PASS: new save, same seat, seed 349176077 | `p/020-p-playagain.png` |
| A finished game can reopen the reveal | PASS: Saved games, Resume on the finished save opens the reveal | `p/` after `015` |

### RS-005 Recommended next to every Accept control

| Check | Result | Evidence |
|---|---|---|
| Desk rail (Full desk): group titled "Recommended" with count, each item "Recommended by <adviser>", own Accept and Change | PASS. Month 1: 7 = 1 crisis answer + 2 orders + 3 meetings + 1 deputy; the main button reads "Accept all recommended (7)" with the same breakdown | `l/007-m1-full.png` |
| Count follows accepts | PASS: one "Accept order" gives 6 and capital 3 to 2; Shift+A on the Full desk accepts the rest, capital 1, navigator "Orders this month 2 of 6", main button greyed "Nothing to accept: every recommendation is decided" | `l/010-m1-acceptall.png` |
| First-use line | PASS: "Your advisers recommend these for this month. Orders and meetings wait for you to accept; a crisis goes ahead on its recommended answer unless you change it." Shown open the first time on rail, sheet and strip | `l/007`, `p/005-p-sheet.png` |
| Phone plan sheet | PASS: Recommended 7 with Accept all (7); after Accept all, "Nothing to accept" | `p/005`, `p/006-p-sheet2.png` |
| Map mode, laptop: folded "Review 6 recommended ... opens the list, accepts nothing"; press only opens | PASS: list of 6 opens in the strip, capital 4 and Orders 0 of 6 unchanged; Hide list folds it | `l/016-m2-map.png`, `l/017-m2-map-review.png` |
| Map mode, phone: Review opens a sheet over the globe, accepts nothing | PASS | `p/011-p-map2.png`, `p/012-p-map-rev.png` |
| Month 1 Shift+A accepts nothing on the simple desk | PASS laptop and phone: "2 staff proposals not accepted", capital 3 before and after | `l/006-m1-shiftA.png`, `p/003-p-m1-shiftA.png` |
| One word and one verb (D-72, D-73) | PARTIAL, see S3-2: month 1 simple desk and the crisis bar still say "Cabinet pick", "Accept cabinet pick", "staff proposals"; advisor cards say "◆ 1 if approved"; phone "4 calls and meetings: On Approve, staff attend 3"; the Map strip shows "Your advisors suggest 5" next to "Review 6 recommended" | `l/005-m1.png`, `adv/adv-before.png`, `p/024-p-m2-focus.png`, `l/016` |
| Rail fits at 1440x900 | PARTIAL, see S3-3 | `l/007`, `l/008-m1-rail-scroll.png` |

### Seats and replay (D-56)

| Check | Result | Evidence |
|---|---|---|
| What if on the title, off by default, only in eras with non-states | PASS: One Term 1960 shows "What if: also lead nations that did not exist yet in 1960, Alternate history, off by default" | `l/032-t1960-list.png` |
| With What if on: Ukraine, Belarus, Syria, Nigeria, UAE, West Bank selectable with the real status | PASS ("What if: Ukrainian SSR: part of another state in 1960"); picking Ukraine shows the Alternate history note and "Take office as Ukraine (what if)"; the game starts (Jan 1960, month 1 of 48); the save row reads "What if: alternate history" | `l/035`, `l/036-t1960-ukr.png`, `l/037-saves.png` |
| West Bank in 2025 and 2026 | PASS by unit guard (QA2-S1-2, `tests/api/seats-replay.spec.ts`); not repeated by hand | |
| Saved games: Replay same opening, Branch from month, Copy seed | PASS: the finished Ceasefire save offers months "0 (the opening)" to 11; Branch from 10 creates "Ukraine, Ceasefire or Collapse (branch from month 10)", same seed, turn 10, playable. Month labels are off by one against the HUD (S3-4) | `l/038-branch.png`, `l/039-branched.png` |

### Newcomers first

| Check | Result | Evidence |
|---|---|---|
| No auto-open situation briefing | PASS (Some help, both seats) | |
| Month 1 goal in one sentence above the crisis | PASS: "Your goal. You win if all four hold at the end of month 12: ..."; One Term: "You win if you are still in office after the election in month 48." | `l/005-m1.png`, `l/028-marc-m1.png` |
| Month 1 simple desk: crisis, cabinet pick, Execute; the rest behind "Show budgets, orders and meetings" | PASS. The rail states "2 staff proposals not accepted (they will not run)" and flags the cabinet pick that works against the mission | `l/005` |
| Staff propose, the player spends | PASS: proposals hold no capital until accepted (HUD 3 left with 2 marked seals) | `l/007`, `l/010` |

### Outcome truth

| Check | Result | Evidence |
|---|---|---|
| Result card and debrief use the engine status | PASS: "DONE, at a cost: United States' view of you -9" on card, debrief and table; National address Done; a 4% ceasefire offer reads "Failed" with the reason ("Russia rejected the ceasefire proposal") on phone | `l/012-m1-result.png`, `l/013`, `l/014-m1-table.png`, `p/022`, `p/023-p-cf-table.png` |
| Your move vs the world | PASS: "The front moves 1 in your favour" is a world row with no status, separate from "What your choice did" | `l/014` |
| Reveal moments direction (QA2-S2-1) | PASS: went well cites tension 55 to 53, approval 80 to 82, tension 70 to 65; went badly cites stability 44 to 36 and slipped objectives | `l/024-rv-mom.png` |

### Seed codes from "Play a seed"

| Code | Result | Evidence |
|---|---|---|
| CO-UKR-MAYA1 | PASS laptop and phone: Ceasefire or Collapse, Ukraine (Zelensky), Nov 2026, 12 months, seed 37462537 (base 36 of MAYA1). Lower case input works | `l/004-seed-maya.png`, `p/002-p-m1.png` |
| T1990-USA-MARC1 | PASS: One Term 1990, United States (George H. W. Bush), Jan 1990, month 1 of 48, seed 37453537 | `l/027-marc.png`, `l/028-marc-m1.png` |
| Same seed, same choices, same result | PASS (spot check): laptop and phone runs of CO-UKR-MAYA1 with the recommended picks both end on "approval 71 to 79%, needs 75%", Presidency Score 471, grade D | `l/022`, `p/014` |

## Regressions versus the registry (regressions.yaml)

Checked by hand against RS-001-5, RS-002-1/2/3, RS-004, RS-005, F-02-1, F-02-4, F-02-5, QA1-S2-1, QA2-S1-2, QA2-S2-1, QA2-AC3 (by layout only). One regression: **S2-1 regresses RS-001-5** ("Suggestions are visible, with a why line, on the desk and the map") and F-02-5 (one order card on map and desk, readable). Its guard `QA1-S2-1.mjs` checks the Map strip only, where a `.advisors.compact` rule hides the bug, so the gate stayed green. Everything else registered and checked holds.

## Bugs

### S1

None.

### S2

**S2-1 Desk advisor suggestions unreadable at every width (REGRESSED: RS-001-5, F-02-5).** Repro: CO-UKR-MAYA1, Full desk in month 1, or any month from 2 in Focus or Full desk, scroll to "Your advisors suggest". Each suggestion card is 300 to 650 px tall and its title is 0 px wide, so "Court United Kingdom", "National address", "Propose ceasefire to Russia" render one letter per line, with "Proposed by staff ... ◆ 1 if approved" squeezed into a narrow column. Measured title width 0 px at 1440 (cards 372 px), 1920 (387 px) and 390 (358 px); before and after accepting. Screens: `l/011-m1-adv-again.png`, `adv/adv-before.png`, `adv-phone/adv-before.png`, `p/024-p-m2-focus.png`. Cause: `ui/src/styles/month.css:150` `.adv-body { justify-items: start }` shrinks the shared `OrderCard` (row variant, brought into the desk list by 9b0d3b9, F-02-5) to its min-content width; the Map strip escapes it through `.advisors.compact .adv-body { justify-items: stretch }` (`month.css:278`). Fix: stretch for the desk too (or give `.adv-card .adv-body > .ord-wrap` `width: 100%`), then add a desk check to `QA1-S2-1.mjs` or `RS-001-5` (title box at least 120 px wide at 1440 and 390) and a Full desk month 2 visual baseline. Owner: month UI.

**S2-2 Phone reveal: Main menu covers the sound button and Skip; tapping Skip leaves the reveal.** Repro: phone (390), finish any Flashpoint, open the verdict. The top bar draws "Main menu" under the sound button and the "Skip" link (`p/014-p-rv.png`, `p/rvhead-390.png`). `elementFromPoint` at the centre of the sound button and of Skip returns Main menu at 360, 390, 430 and 600 px wide (fine at 820 and up). A tap on "Skip" at (356, 30) went straight to the title screen (`p/015-p-skiptap.png`); the sound toggle cannot be reached. The game survives (Saved games, Resume reopens the reveal), but a player who wanted to skip to the report loses the reveal without a word. Cause: `ui/src/styles/reveal.css:1913` and `:1918` (from dd34b3f, the RS-004 fix) place `.rv-menu-exit` absolute top right with `z-index: 5`, over the phone top bar that already holds sound and Skip. Fix: put Main menu in the phone top bar's flow (or at the bottom bar next to Back) below 700 px, and extend `RS-004.mjs` to assert that Main menu, sound and Skip do not overlap. Not a regression of a registered finding; it is a side effect inside RS-004's own code. Owner: reveal UI.

### S3

- **S3-1 Familiarity sample sentence is from 2026 in every era.** One Term 1990 (and 1960) asks "How well do you follow world news?" with "US mediators propose a zone in Donetsk oblast, including the fortress belt of Kramatorsk" (`l/027-marc.png`; hard coded in `ui/src/components/learn/FamiliarityPrompt.tsx:22`). Marcus (1990 control) will read it as an anachronism. Use a line from the chosen seat's opening crisis or situation.
- **S3-2 Wording is not yet one word and one verb (D-71, D-72, D-73).** "Cabinet pick" tag and "Accept cabinet pick" in the crisis bar and option cards, "Cabinet pick on 1 crisis, 2 staff proposals not accepted" in the rail (`l/005-m1.png`), "◆ 1 if approved" on advisor cards (`ui/src/components/orders/OrderCard.tsx:400`), "On Approve, staff attend 3" on the phone desk (`p/024-p-m2-focus.png`), and two counts side by side in the Map strip ("Your advisors suggest 5" and "Review 6 recommended", `l/016-m2-map.png`). D-72 asks for "Recommended by <adviser>" on the advised option and "Accept" throughout.
- **S3-3 Desk rail at 1440x900 is too short for the Recommended list.** The political capital seals are cut in half, and the list shows about one item at a time above the sticky "Accept all recommended (7)", which overlaps the second item's header (`l/007-m1-full.png`, `l/008-m1-rail-scroll.png`). Everything is reachable by scrolling inside the rail; on a 1440x900 laptop it reads cramped and the item being accepted is often out of view.
- **S3-4 Month numbering differs between Saved games and the game.** Save rows count months done ("month 0 of 48" for a new game, "month 12 of 12 finished"), the branch picker offers "0 (the opening)" to 11, and the HUD, reveal moments and report count from 1. "Branch from month 10" opens on HUD "Month 11 of 12" (`l/038`, `l/039-branched.png`). A player who wants to redo the month the reveal calls "Month 9" cannot tell which number to pick. Label the picker with the HUD month and date ("Month 10, Aug 2027: before your choices").

### S4

- Phone HUD: with 6 seals the "More" button is pushed past the right edge (`p/024-p-m2-focus.png`).
- Phone month 1 goal sentence: a lone "," on its own line after "(relations 33+)" (`p/002-p-m1.png`).
- Phone plan bar after Accept all (7) reads "1 left · 6 decided" (the deputy is not counted).
- Debrief Table on phone runs wider than the screen (Numbers column cut, scrolls inside the table) (`p/023-p-cf-table.png`).
- "Replay or branch" in Saved games and "Play a seed" on the title look like plain text (disclosure summaries), not controls (`l/037-saves.png`, `l/001-title.png`).
- 1960 What if Ukraine keeps its 2026 profile text ("A nation forged in war...") and economy ($210B) (`l/036-t1960-ukr.png`).
- `docs/GAMEPLAY.md` Recommended paragraph: "unless you change it. (each crisis item says so too)." (stray full stop before the parenthesis).
- Still open from iteration 2: the far-side rim marker on the title headline (`l/001-title.png`, `l/003-seedform2.png`) and the report month strip painting the last month black ("black the fall") on a time-up mission failure (`l/025-rv-report.png`, `p/019-p-report2.png`).
