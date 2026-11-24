# QA verify: iteration 4 integrated build

QA Engineer, 2026-11-24. Build under test: `dev/rc1-synthetic-loop` at e3ae434 (code tree 3357db078eef93a5, the tree the loop controller's last verify pass covers). Nothing in the game was changed and nothing was committed. `npm run verify` was not rerun (brief); its pass on this tree at 2026-11-24T11:59 is taken from `node devloop/kit/loop.mjs status`. This round is a hand check in a real browser on my own servers (API 8760 with `DB_DRIVER=json`, own saves folder, `WC_DAILY_DATE=2026-11-22`; UI 5760 proxied to it), driven by a persistent Playwright driver per screen size (`qa-verify/_scripts/srv.mjs`, `month.js`, `phone-month.js`). Every session recorded page errors, console errors, failed requests, native dialogs and any request leaving localhost.

Evidence: `runs/iter-04/qa-verify/` (36 screenshots, prefix `d-` 1920x1080, `l-` 1366x768, `p-` 390x844; numbers are the session order). The full scratch set (d-001 to d-097, l-001 to l-012, p-001 to p-013) stays in the session scratchpad.

## Verdict

**NOT READY for the customer panel: four S2s, one of them a regression of the D-84 / DR-INT-3 rule. No S1.** The month screen, order cards, Your call, the stability package and DR-INT-1 to 7 work in the browser at 1920x1080 through a whole Flashpoint (12 months, reveal, report, branch), a Term (3 months) and Quarantine as China (4 months), and the game can be played without getting stuck at 1366x768 and 390x844. 0 page errors, 0 console errors, 0 native dialogs, 0 external requests in every session. What blocks the panel:

- **QA4-S2-1 (new)** The shipped fonts never load: every face is in error and the whole game renders in fallback fonts. Goal 5 is half met (no Google request), the other half (the game's own fonts) is not.
- **QA4-S2-2 (new, same root as F-02-4)** "Free ◆ n" on an order card the player cannot afford removes a different, unrelated item from the month.
- **QA4-S2-3 (REGRESSED class: DR-INT-3, D84-ADVISERS)** Ask your staff tells the player the opposite of the desk: the Chief of Staff recommends a different answer from the one the desk says the Chief of Staff recommends and will apply.
- **QA4-S2-4 (new)** At 1366x768 every answer card on a call shows only its "Hurts" tag; the "Helps" tags, the goals panel, the adviser quote and "Best trade-off for your mission" are dropped, so every answer reads as goal-hurting.

S2-1 is likely a one-command fix (the font packages are in `ui/package.json` and the lock file but not installed), plus a guard so a build that cannot resolve them fails. With the four fixed and guarded, the build can go to the panel.

## Gate

| Check | Result |
|---|---|
| `npm run verify` (full gate) | PASS on code tree 3357db07 (e3ae434) at 2026-11-24T11:59, from the loop controller; not rerun (brief) |
| Loop controller | Use blocked only on `qa-before-use` (this report); verify, design review and status refresh recorded on this tree |
| Production build (scratch `vite build` into the scratchpad) | Builds, but warns that `url(@fontsource-variable/...)` "didn't resolve at build time"; 0 woff2 files in the bundle (QA4-S2-1) |
| Manual play, 1920x1080 | Hormuz USA, 12 months (Desk and Map mode, all orders, danger orders, a FAILED order, reload, save and resume, Chief of Staff setting both ways), reveal all stages, report, Saved games, branch from month 4; Term USA 3 months; Quarantine China 4 months; codex, familiarity, Explain, Your country, Mission sheet, a meeting. 0 page errors, 0 console errors, 0 dialogs |
| Manual play, 1366x768 | Hormuz USA, 3 months to the result. 0 page errors; no horizontal scroll, no blocked control; QA4-S2-4 |
| Manual play, 390x844 | Hormuz USA, 3 months to the result. 0 page errors; no horizontal scroll, no blocked control |
| Network | No request left localhost in any session (no Google Fonts). Only failed requests: aborted `/api/scenarios` and `/api/countries` on navigation |

## Iteration 4 acceptance

### The month screen (RS-006, RS-008)

| Check | Result | Evidence |
|---|---|---|
| The month as a list of things, one open at a time, with "N of M", Next, Back, See all | PASS at all three sizes; the List, the open item and the Plan rail fit at 1920 with no page scroll | `d-003-m1-desk.png`, `d-097-cap-meeting.png` |
| Show: One at a time / Everything | PASS, both directions, state kept | `d-097-cap-meeting.png` |
| Plan: Decided, Recommended, Choose all recommended, If you execute now, Execute | PASS, except the "If you execute now" list is cut to 3 lines (QA4-S3-2) | `d-003`, `d-097` |
| Check and execute (review page) names every answer, what it answers and its cost | PASS (DR-INT-7 holds) | `d-016-m1-review.png`, `d-037-m3-review.png` |
| Map mode: a whole month played from the map (month 2), See all 8, Check and execute from the map | PASS | `d-019-m2-map.png`, `d-024-m2-map-seeall.png` |
| Map turns to the subject (DR-INT-5): Middle East for Iran items, Taiwan for Quarantine | PASS | `d-019`, `d-093-fp2-m4-map.png` |
| Result card with Next month on screen at 1920 (RS-008) | PASS | `d-017-m1-result.png`, `d-038-m3-result.png` |
| 1366x768 and 390x844: three months without getting stuck | PASS; layout notes QA4-S3-20, S3-21 (screen-size pass); untrue cards QA4-S2-4 | `l-003-m1.png`, `l-005-m1-review.png`, `p-004-m1-desk.png`, `p-008-m1-review-full.png`, `p-013-m3-result.png` |

### Order cards (RS-007)

| Check | Result | Evidence |
|---|---|---|
| All orders: family tabs with counts, search ("spy iran", "strike iran") | PASS (DR-MS-1 holds at 1920) | `d-012-m1-strike-search.png` |
| Target picker as a listbox with the relation ("Iran: At war with you") | PASS | `d-032-m3-target-picker.png` |
| Forecast ("How much? Forecast") | PASS; one colour slip (QA4-S3-13) | `d-034-m3-forecast.png` |
| Danger orders: Strike nuclear sites needs "Give the order" or Cancel; given, it runs and reports DONE | PASS | `d-015-m1-strike-confirm.png`, `d-017-m1-result.png` |
| Nuclear strike needs "Hold to authorize" or "Stand down" | PASS (stood down) | `d-013-m1-nuke-confirm.png` |
| An unaffordable card offers "Free ◆ n" | FAILS: frees the wrong item (QA4-S2-2) | `d-012`, `d-014-m1-free-capital.png` |
| A FAILED order: Propose ceasefire to Iran at 0% chance | PASS: result reads "Propose ceasefire to Iran failed", reason "Iran rejected..."; the capital is not charged, but nothing says so (QA4-S3-1) | `d-038-m3-result.png` |

### Your call (D-84, D-85)

| Check | Result | Evidence |
|---|---|---|
| Each month's calls carry two advisers on different answers, a goals panel, and "Leave it open" with what leaving does | PASS at 1920 (Hormuz, Quarantine); Term USA months 1 and 3 had no call (known from the play pass, not re-reported) | `d-003-m1-desk.png`, `d-082-fp2-m1.png`, `d-071-term-m1.png` |
| Setting off: a call is never pre-filled, "No answer yet. If you leave it, ..." and the plan say the same thing (D-85 (5), D84-DESK-TRUTH) | PASS | `d-003` |
| Setting on (Settings, "Let the Chief of Staff make my calls"): "Recommended: <pick>", the plan says the Chief of Staff's answer applies | PASS on months that arrive in the session; not on a resumed, reloaded or branched month (QA4-S3-4) | `d-050-m5-cos-on.png`, `d-054-m6-desk-cos-on.png`, `d-065-branch-m4.png` |
| Choose all recommended decides the routine things only, "Your call stays open" | PASS (wording); spends capital the open mission move needs (QA4-S3-3) | `d-097`, `d-022-m2-map-court-unaffordable.png` |
| No adviser backs a goal-hurting answer while a safe one exists (D-72, D84-ADVISERS) | PASS on the desk; FAILS in Ask your staff (QA4-S2-3) | `d-054`, `d-055-m6-askstaff.png`, `d-056-m6-askstaff-scrolled.png` |

### The stability package (D-76) and DR-INT-1 to 7

| Check | Result | Evidence |
|---|---|---|
| DR-INT-1: the mission move and Recommended orders cards use the middle of the screen at 1920 | PASS | `d-097-cap-meeting.png` |
| DR-INT-2: one capital number on the band, plan, Hold card and review, and the engine starts the next month with it | PASS every month of the Hormuz run, except when an order fails (QA4-S3-1) | `d-016`, `d-037`, `d-038` |
| DR-INT-3: no adviser quote contradicts its card | PASS on the desk; the class reappears in Ask your staff (QA4-S2-3) | `d-003`, `d-056` |
| DR-INT-4: "+n more" counts hurts only, a mixed answer names what it helps | PASS at 1920; at 1366 the Helps part is dropped (QA4-S2-4) | `d-003`, `l-003-m1.png` |
| DR-INT-5: Map turns to the subject | PASS | `d-019`, `d-093` |
| DR-INT-6: Ask your staff in the game's words | PARTIAL: no engine codes or emoji; "Turn 5" and "We are at peace" in the briefing (QA4-S3-15); the answer sits in a 265 px scroll area under the chips (part of QA4-S2-3) | `d-055`, `d-056` |
| DR-INT-7: review rows name what they answer and the cost | PASS | `d-016`, `d-037` |
| Reload mid-month keeps the month's choices | PASS | `d-042-m4-before-reload.png`, `d-043-m4-after-reload.png` |
| Main menu, Saved games, Resume keeps the month | PASS | `d-053-m5-resumed.png` |
| Saved games labels match the HUD ("month 5 of 12"; branch picker "Month 4, Feb 2027: before your choices"): QA3-S3-4 fixed | PASS | `d-064-saves-branch.png` |
| Branch from month 4 reproduces month 4 exactly | PASS | `d-065-branch-m4.png` |
| Reveal, all stages, report; the last square of the month strip is green on a win (iteration 2 leftover fixed) | PASS: MISSION COMPLETE, grade A, 737 | `d-059-reveal-2.png`, `d-063-report.png` |
| Settings: Chief of Staff toggle both ways; sound toggle flips its label and storage; codex; familiarity popover | PASS | `d-050` |

### Fonts ship with the game

| Check | Result | Evidence |
|---|---|---|
| No request to Google Fonts or any other host | PASS in every session (`S.external` empty) | driver logs |
| The game's own fonts load | FAILS (QA4-S2-1): `document.fonts.check('16px Geist')` is false, every face has status "error" | `d-001-title.png` (fallback faces) |

## Regressions versus the registry (regressions.yaml)

Checked by hand against D84-ADVISERS, D84-DESK-TRUTH, D84-SETTING, DR-MS-1 to 4, DR-INT-1 to 7, F-02-4, F-02-5 and QA3-S3-4. One regressed class: **QA4-S2-3** repeats DR-INT-3 and D84-ADVISERS ("no adviser backs a goal-hurting card") in the Ask your staff panel, which neither guard covers (both check `advisors.ts` and the desk cards; `ui/src/utils/advisorBrain.ts` ranks answers with its own scoring). Under D-76 this counts as REGRESSED. **QA4-S2-2** is new but shares the root of F-02-4 (proposals versus committed orders in the store). Everything else registered and checked holds.

## Bugs

### S1

None.

### S2

**QA4-S2-1 The game's fonts never load (new).** Repro: `npm run dev` on a checkout where `cd ui && npm install` was last run before c34d056 (as on this machine); open the title and run `document.fonts.check('16px Geist')` in the console: false; every `FontFace` in `document.fonts` has status "error". The font URLs (`/node_modules/@fontsource-variable/geist/files/...woff2`) return index.html as text/html. A scratch `vite build` warns "didn't resolve at build time" and bundles 0 woff2 files; the built CSS keeps `url(@fontsource-variable/...)`. Cause: `ui/src/styles/fonts.css` (c34d056) points at `@fontsource` packages that are in `ui/package.json` and `ui/package-lock.json` (5.3.0) but not installed in `ui/node_modules`, and Vite only warns on an unresolved CSS `url()`. Every screen renders in fallback faces. The gate passed because nothing checks it. Fix: `cd ui && npm ci`; consider having `npm run setup` or `verify` check that `ui/node_modules` matches the lock. Guard: fail `npm run build` on an unresolved `url()` (a Vite plugin or a post-build check that the bundle holds the woff2 files), and assert in the smoke playtest that `document.fonts.check('16px Geist')` is true and no face has status "error". May be environment and process rather than code, but it would reach any panel run from this tree. Owner: build engineer.

**QA4-S2-2 "Free ◆ n" on an unaffordable order card removes a different item (new; same root as F-02-4).** Repro: Hormuz USA, month 1. Answer The January clock with Reply via Muscat, choose National address on The move for your mission (◆ 1 left), then add Spy on Iran from All orders (◆ 0 left). Leave Reform program (Recommended, not chosen). Open All orders, search "strike iran", press "Free ◆ 1" on "Strike nuclear sites in Iran" (`d-012-m1-strike-search.png`). Result (`d-014-m1-free-capital.png`): Reform program, an unapproved recommendation that holds no capital, disappears; "This month: 3 things" becomes 2; capital stays at ◆ 0 and the strike stays blocked. Expected: the order the card names as holding the capital is removed and the strike becomes affordable, or the button is not offered. Cause: `ui/src/components/orders/OrderCard.tsx` lines 375 to 391 call `removePendingAction(block.slots[0])`; the slot index comes from `monthView()` in `ui/src/store/gameStore.ts` (about line 1500), which counts `committedActions(pendingActions)` only, while `removePendingAction` (line 1209) indexes the full `pendingActions`, proposals included. Guard: a store unit test with one proposal before a committed order that presses Free and asserts the committed order is removed and the proposal kept, plus a DR-MS-1 step that presses Free on a blocked danger order and checks the capital rises. Owner: month UI.

**QA4-S2-3 Ask your staff contradicts the desk (REGRESSED class: DR-INT-3, D84-ADVISERS).** Repro: Hormuz USA, month 6, The Qatari text, Settings "Let the Chief of Staff make my calls" on. The desk says "Recommended by your Interior Minister and your Chief of Staff: Counter: zero enrichment", and the plan says "The Chief of Staff's answer to The Qatari text applies: Counter: zero enrichment" (`d-054-m6-desk-cos-on.png`). Press Ask your staff, Chief of Staff, "The Qatari text: what do you advise?": the reply is "On "The Qatari text", my recommendation is: Accept the framework ... at the cost of ties with Israel, approval" (`d-056-m6-askstaff-scrolled.png`), an answer that hurts two mission goals (Voters stay on side, Israel stays on side). The reply sits in a 265 px scroll area under the chips, so it is first hidden (`d-055-m6-askstaff.png`). Why S2: the player asks the adviser who will make the call and is told the opposite, and is steered to a goal-hurting answer, which D-72 and D-84 forbid. Cause: `ui/src/utils/advisorBrain.ts` `adviseOnItem` (line 666 on) ranks options with its own `scoreOption(lens)` and ignores the call's cards and mission goals. Fix: answer a crisis question from the same source as the cards (`advisors.ts` crisisCall / the item's recommendations). Guard: extend `DR-INT-3` (vitest) or add a script that, for each call of the Hormuz and Quarantine control seeds, asks each named adviser and asserts the reply names that adviser's card, and never a goal-hurting card while a safe one exists. Owner: advisers.

**QA4-S2-4 At 1366x768 every answer card shows only "Hurts" (new; untrue by omission, kept at S2 although outside the reference size).** Repro: 1366x768, Hormuz USA, month 1, The January clock (`l-003-m1.png`). The cards read "Reply via Muscat · costs ◆ 1, Hurts: Voters stay on side", "More escorts, no strikes, Hurts: Voters stay on side", "Hit the IRGC navy now, Hurts: The shooting stops (+1 more)". At 1920 the same cards also say "Helps: The shooting stops", "Helps: Iran never tests a bomb and Voters stay on side", carry the adviser quotes and "Best trade-off for your mission", and a "Your goals in this call" panel sits beside them (`d-003-m1-desk.png`). At 1366 all of that is dropped. A player on a common laptop sees every answer as only hurting the mission and cannot see which one the Foreign Minister calls the best trade-off. The S2 rating is a judgement call: nothing is blocked, but the main decision of the month is shown untrue. Guard: extend `DR-INT-4` / `RS-008-1` to 1366x768: each answer card that helps a goal shows its Helps text, and the goals panel or an equivalent is reachable. Owner: month UI.

### S3

- **QA4-S3-1 A failed order's capital is kept, but nothing says so.** Month 3, Propose ceasefire to Iran (0% chance) fails; the plan and review said "◆ 3 spent, start next month with ◆ 3"; month 4 starts at ◆ 4 (`d-037-m3-review.png`, `d-038-m3-result.png`). The engine is right (`src/core/turn.ts` charges only when `outcome.ok`), but the result card should say "not charged: the order failed". Touches DR-INT-2 (one picture of capital).
- **QA4-S3-2 "If you execute now" is cut to 3 lines.** `ui/src/lib/agenda.ts` ends the summary with `out.slice(0, Math.max(3, callItems.length + 1))`, so "N orders run (◆ x)" and "The recommended orders do not run" are dropped; seen on the month 2 desk, the laptop and phone reviews (`d-014` shows the line cut under the coach bubble).
- **QA4-S3-3 Choosing an unaffordable card does nothing on the card.** Reform program in month 1, Court UAE on the mission move in month 2: only a short callout at the capital (`d-022-m2-map-court-unaffordable.png`); "Recommended (0), still to do" still lists an item, and "Nothing to choose: every recommendation is decided" is untrue while one is left (`d-014`). Choose all recommended spends the capital the open mission move needs (months 2 and 4), although the Settings text says the staff always leave at least ◆ 1.
- **QA4-S3-4 The Chief of Staff setting does not pre-fill a call on a resumed, reloaded or branched month,** only on months that arrive in the session (D-85 (5) says the call starts on the Chief of Staff's pick). The desk is truthful about what leaving the call does (`d-065-branch-m4.png`).
- **QA4-S3-5** With the setting on, the result says "You chose: Counter" when the Chief of Staff picked it.
- **QA4-S3-6** Turning the setting on mid-month drops the open mission move from the plan.
- **QA4-S3-7** Guide me answer card: the text runs over the card border (`d-zoom-card3.png`).
- **QA4-S3-8** The coach bubble "When you are ready, run the month" covers the plan's capital line on the desk and on the review page (`d-014`, `d-016-m1-review.png`).
- **QA4-S3-9** The review page colours "Helps: The shooting stops" red with the Hurts text, on desktop and phone (`d-016-m1-review.png`, `p-008-m1-review-full.png`).
- **QA4-S3-10** The Reform program quote cites "Mission: approval needs 56%+", but the order moves stability and legitimacy (Recommended orders, month 1).
- **QA4-S3-11** Goals panel says "Fire them and prosecute hurts Stability 60%+", but the card has no Hurts tag (corruption scandal, month 5).
- **QA4-S3-12** "General Secretary Un agrees to keep talking" (should be Kim).
- **QA4-S3-13** "Choose one of 1 order"; and the forecast shows "Tension about +2" in green while the table shows tension 0 from Denounce (`d-034-m3-forecast.png`).
- **QA4-S3-14** Ranking share buttons sit under the footer bar at 1920x1080 (`d-063-report.png`).
- **QA4-S3-15** Ask your staff briefing says "Turn 5" in month 6 and "We are at peace" during the North Korea standoff and the Iran war (`d-055`).
- **QA4-S3-16** The Settings dialog is titled "World intelligence" (`d-050-m5-cos-on.png`).
- **QA4-S3-17** The reveal says "Next: 15 achievements" against "14 achievements" (14 earned plus 1 infamy).
- **QA4-S3-18** Quarantine China plan: "The 3 recommended orders do not run" next to "Recommended orders (2)" in the List.
- **QA4-S3-19** The Recommended orders item shows Remove under a card that was never chosen.
- **QA4-S3-20 (screen-size pass)** Phone review shows "If you execute now" twice (`p-008-m1-review-full.png`).
- **QA4-S3-21 (screen-size pass)** Laptop review rows are cut by the news ticker (`l-005-m1-review.png`).

### Seen, already known (not re-reported)

DR-INT-9, 14, 16, 22 and 23 as described; the play-pass items: "To keep things calm" as the escalating answer (North Korea, Reinforce), leaving a call is free, Term USA months 1 and 3 with no call, too few decisions late in the game. None is worse than described.
