# Design review: build-agenda-layout, the new month screen (D-81)

- Reviewer: UX Designer and Art Director in one pass (fresh reviewer, judged on the built screens)
- Branch and commit: `build-agenda-layout` at 80eb8d7, worktree `C:\MyData\git\WorldConflict-agenda`
- Servers: my own, API on 8750 (`DB_DRIVER=json`, `WC_DAILY_DATE=2026-11-22`, saves in my scratchpad), UI on 5750 (`VITE_API_PROXY`); one browser, one page at a time; both stopped at the end, ports 8750 and 5750 confirmed free. The gate on 8640 / 5640 was not touched.
- Seats: Hormuz Convoy as the United States (seed 4242, months 1 to 5), Quarantine as China (seed 4242, months 1 and 2), a Term game as the United States (scenario 2026, seed 4242, months 1 and 4). Setting "Let the Chief of Staff make my calls" off everywhere, and on for Hormuz months 1 and 2.
- Sizes: 3440x1440 first, then 1920x1080, 1440x900, 1366x768, 1024x768, 390x844 and 360x740 (mobile emulation with touch); 2560x1440 for one List measurement.
- Method: Playwright scripts (copied with their logs to `design-review-month-screen/_scripts/`: `tour.mjs`, `m1.mjs`, `m1coach.mjs`, `phone.mjs`, `orders.mjs`, `rows.mjs`, `cat.mjs`, `flow.mjs`, `listclip.mjs`, `misc.mjs`, `deputy.mjs`, `pc.mjs`, `paper.mjs`, `paper2.mjs`). Saves were created through the API (months resolved with no orders and default answers) and opened with Continue; the newcomer path was played from the title. Every screenshot named below was looked at. Screenshots are in `design-review-month-screen/`.

## Verdict: NOT APPROVED

The month screen itself is a large step forward and at 3440x1440 it is the screen the layout design promised: one state band line, List / Thing / Plan side by side, the crisis with its story, goals, advisers and context in three columns, the "Your call" question with a true leave sentence, Choose all recommended with an honest disabled line, no page scroll and no inner scroll on the month (`t-hc-m4-3440x1440-01-desk.jpg`). The open call reads as open everywhere I checked, including the result card and See everything (C2-2 closed).

It cannot merge because of one S1 and three S2s that this package caused or owns:

1. **S1-1:** the All orders catalogue is cut off at every desktop size with no scroll, no tabs and no signal. At 1366x768 the player sees six Diplomacy tiles and nothing else; at 3440x1440 the Economy and Home families are off the screen. Ordering by browsing is broken for every desktop player.
2. **S2-1:** the List (column and See all panel) clips its own rows with no fold and no scroll; at 1920x1080 after Choose all, "Your own orders" disappears below the ticker.
3. **S2-2:** the review page says meetings and recommended orders are "Left to your advisers" with "Recommended: X" under each, but ministers take the meetings on their default answer and recommended orders are not given at all.
4. **S2-3 (carried C-2, not met):** "What your advisers say" still uses the authored backers, so the same adviser recommends one answer on the card and another in the voices block, under a heading that says the advisers agree.

A fourth S2 (S2-4, the "move for your mission" layout at 3440 and 1920) can be carried honestly to the design pass.

## Findings

### S1

**S1-1. All orders catalogue clipped, whole order families unreachable by browsing (all desktop sizes).**
- Seen: Hormuz USA month 2, Your own orders, All orders. 3440x1440: Diplomacy, Military and Nuclear show; Covert is cut halfway, Economy (top at y1584) and Home (y1854) are below a 1440 px screen (`o-hc-m2-3440x1440-02-catalog-iran.jpg`). 1366x768: two rows of three Diplomacy tiles, the second row cut; Military starts at y866, Nuclear y1780, Covert y2127, Economy y3032, Home y3347, all invisible (`c-1366x768-catalog-after-wheel.jpg`). 1920x1080 and 1024x768 the same pattern (`_scripts/log-cat-*.txt`).
- Measured: `section.detail` has `overflow: hidden`, scrollHeight 1967 against clientHeight 1232 at 3440 (2741 / 811 at 1920, 3447 / 516 at 1366, 2703 / 441 at 1024); a mouse wheel over the catalogue moves nothing (scrollTop stays 0); no family tabs exist (design-layout.md section 7 asked for tabs with counts, deferred by the engineer).
- What a player experiences: "All orders" shows a few diplomacy orders and stops. There is no scrollbar, fade or count, so a player concludes that declaring war, strikes, sanctions, reform, policing and covert orders do not exist on the desk. They remain reachable only by typing in search, through the staff suggestions or through Map mode's country menu, none of which the screen points to. At 1366x768 even Declare war and the strikes are hidden.
- Cause: `ui/src/styles/layout.css` line 346 `.item > .detail { height: 100%; overflow: hidden; ... }` with the catalogue (`ui/src/components/orders/OrderCatalog.tsx`) taller than the region.
- Fix (this package): build the family tabs with counts that design-layout.md section 7 specifies (each tab's tiles fit as a grid), or, as an interim, make the catalogue a signalled reading scroll (`data-scroll="reading"`, visible scrollbar, bottom fade, "4 more families below: Covert 8, Economy 5, Home 4" cue) and add a guard: every family heading of the catalogue is in view or reachable by a visible control at 1024x768, 1366x768, 1920x1080 and 3440x1440.

### S2

**S2-1. The List clips its rows with no fold and no scroll (1920x1080 column; See all panel at 1366x768, 1024x768 and in Map mode at 1440x900 and below).**
- 1920x1080, Hormuz month 2, after Choose all recommended: the rows grow to "Decided: ..." and the last row "Your own orders" sits at y1073 to 1150 in a column that ends at 1056 (scrollHeight 974, clientHeight 851, `overflow: hidden`); month 5 before Choose all already overflows by 9 px (`_scripts/log-listclip.txt`, `f-hc-m2-1920x1080-02-after-choose-all.jpg`, `l-1920x1080-m2-after-choose-all.jpg`). 2560x1440 month 5 overflows by 50 px (the mission foot).
- See all panel at 1366x768 and 1024x768, month 4: 6 of 8 rows, the Putin row cut through its text, "Recommended orders (3)" and "Your own orders" below the panel's edge, no scroll (`t-hc-m4-1366x768-02-seeall.jpg`). In Map mode the panel shows 4 rows at 1366 and 1024 and 5 at 1440 (`t-hc-m4-1366x768-03-map.jpg`, `t-hc-m4-1024x768-03-map.jpg`, `t-hc-m4-1440x900-03-map.jpg`).
- Player: the list that promises "This month: 9 things" shows 7 or 8 and the last ones, including the only row that leads to the player's own orders on these sizes, are simply not there. Next still walks to them, so play is not blocked, but this breaks L-13 / AC-L4 ("nothing is ever only below the fold") on the screen the guard is meant to protect.
- Cause: `ui/src/styles/layout.css` line 240 `.agenda-list.f-column { overflow: hidden }` and line 259 `.agenda-list.f-panel { max-height: ...; overflow: hidden }`; the fit rule exists for the Plan but not for the List.
- Fix (this package): apply a fit rule to the List (compact rows to one state line, then fold the decided rows to a summary "6 decided ▾"), and extend RS-008-1 to measure the List after Choose all at 1920x1080 and the See all panel at 1366x768 and 1024x768.

**S2-2. Review page: "Left to your advisers" says the wrong thing will happen (all sizes; worst on phones).**
- Hormuz month 4, nothing chosen. Review ("Check what will happen"): "Left to your advisers (5)" lists Staff meeting: the front, Interview, Merz, Putin and Recommended orders (3); on the phone each row carries "Recommended: Call up more reservists", "Recommended: Promise full support", ..., "Recommended: Hunt foreign spies, Reform program, Spy on Iran" (`p-hc-m4-390x844-05b-review-full.jpg`, `_scripts/log-phone-hc-m4-390x844.txt`); on the desktop the summary line is the titles plus "Choose all recommended decides them" (`t-hc-m4-1024x768-04-review.jpg`, `t-hc-m4-3440x1440-04-review.jpg`).
- What the engine then did (turn report of that month, `_scripts/log-tour-*`, and the saved world): "Staff meeting: the front: Let them handle it (you did not attend)", "Interview: Send a spokesperson (you did not attend)", both calls "Let the foreign ministry take it"; no order was given (Orders 0 of 6 next month).
- Player: reads that their advisers will carry out the recommended answers and orders, executes, and gets the ministers' default answers and no orders. The Plan's own line on the same page ("Your ministers take 4 meetings for you: Germany -1, Russia -1") is right, so the page contradicts itself.
- Cause: `ui/src/components/desk/ReviewPage.tsx` lines 86 to 101 (heading "Left to your advisers", sub-line `Recommended: ${x.rec}`).
- Fix (this package): rename the section "Not decided (5)" and say per kind what Execute does: meetings "Your minister takes it: <default answer>" (with its effect if any), recommended orders "Not given unless you choose them", and keep "Choose all recommended decides them". Add a D84-DESK-TRUTH style check that every review row's sentence matches the turn report.

**S2-3. Carried C-2 not met: adviser voices contradict the recommendation on call crises (3440x1440, every tall screen).**
- Hormuz month 4, "Tanker hit in the strait": the question says "Your call: your advisers agree, and the choice is yours"; the first card says "Recommended by your Defense Minister and your Chief of Staff" (Full convoy operation); "What your advisers say" below shows "Chief of Staff: Punish the mining. (Strike the IRGC naval bases)" and "Finance Minister: ... (Wait for the minehunters)" (`t-hc-m4-3440x1440-01-desk.jpg`).
- Player: the same adviser backs two answers on one screen, and the heading says the advisers agree while three of them name three answers. This is exactly the C-2 condition from the first Your call review (render the engine's call advisers, not the authored `backedBy`).
- Cause: `ui/src/components/desk/YourMove.tsx` line 204, `Advisers()` builds the voices from `o.backedBy`.
- Fix (this package): on call crises build the voices from the engine's call card advisers (the same source as the card's "Recommended by" line), and pick the question variant ("agree" / "disagree") from the same data. The Guide me Chief of Staff line was not checked (not covered).

**S2-4. "The move for your mission" thing looks broken on wide screens (3440x1440, 1920x1080). Can be carried to the design pass.**
- 3440x1440 month 1: the two order cards and "Hold this month" sit at the bottom of the answers column (y about 1000 to 1390) with about 800 px of empty column above them; the situation box above "Your goal" is an empty frame; no context column (`m1c-hc-3440x1440-3-0.jpg`). 1920x1080: the same gap, and the two order cards are about 270 px wide with one or two words per line and different heights (`m1c-hc-1920x1080-3-0.jpg`). 1366x768 is fine apart from an empty scene band (`m1c-hc-1366x768-3-0.jpg`).
- Player: the move that defines the mission every month (D-84) looks like an unfinished page on the CEO's screen; the answer cards are the hardest to read on the desk.
- Cause (inferred): `article.thing.is-simple[data-thing="move"]` in `YourMove.tsx` line 476 inherits the call layout's column grid and bottom alignment without the story or context blocks.
- Owner: the design pass after this merge, before the customer round (nothing is misleading or unreachable).

### S3

1. **Map mode does not centre the subject** (3440x1440, 1440x900, 1366x768, 1024x768). Hormuz month 4 "Tanker hit in the strait": the globe shows North America; Iran and the strait are off the visible face (`t-hc-m4-3440x1440-03-map.jpg`, `t-hc-m4-1440x900-03-map.jpg`). L-14 asks the camera to centre the subject in the gap between the card and the Plan. File hint: `ui/src/components/MapView.tsx` camera on focus change.
2. **State band wraps to three lines and moves the screen** (1920x1080: 101 px tall at start, 144 px after Choose all because "Orders 2 of 6" and "Meetings you take 3 of 3" widen the line, so everything below jumps 43 px, `f-hc-m2-1920x1080-02-after-choose-all.jpg`; 1366x768 and 1024x768: always three lines, 143 px of 768, `t-hc-m4-1366x768-01-desk.jpg`). Design: two lines at L and D, one at U. Numbers in the band matched the engine on every month I checked.
3. **Capital on the result card looks spent** (all sizes). Month 4 ends with "Political capital 6 stays (above 6 is lost)"; the result card's band then shows ◆ 4 of 6 (`t-hc-m4-3440x1440-05-result.jpg`, `p-hc-m4-390x844-06-result.jpg`). The engine holds 6; the band already deducts month 5's pre-filled cabinet answer "Take it to the country" (◆ 2) (`_scripts/log-pc.txt`). Show it as "◆ 4 of 6 (2 held by Impeachment looms)" or show the bank on the result card.
4. **Review page at 3440x1440 is stretched**: row labels at the left, their Open buttons about 1100 px away, the Plan card floating with the right third of the screen empty (`t-hc-m4-3440x1440-04-review.jpg`). Also "If you execute now: If you leave it: Wait for the minehunters." doubles its prefix (all sizes).
5. **See everything at 3440x1440**: a centre column about 1200 px wide with roughly 60% of the screen empty (`t-hc-m4-3440x1440-06-details.jpg`); at 1366x768 and 1024x768 it scrolls inside (`main.db-stage` 514/480, 529/433) and cuts the "Left open" card mid-line with no cue (`t-hc-m4-1024x768-07-everything.jpg`). Judgement on the engineer's note: the empty right side of the result card at 3440 is acceptable (the scene fills the left half and the text block keeps its reading width); the See everything page and the paper at 3440 are not acceptable for release but acceptable to carry to the design pass (WP-L2 details grid and paper pagination).
6. **The paper**: at 3440x1440 the lead story is one line beside a 1350 px picture with the rest of the column empty, and the floating "Next month" sticks out past the paper's right edge over the masthead rule (`n2-3440x1440-paper.jpg`); at 390x844 "Next month" covers the masthead "The World Chronicle" (`n-390x844-paper.jpg`); at 1920 and 3440 the paper scrolls in an overlay (pagination deferred).
7. **"How it got here"** repeats entries ("Israel launches airstrikes on Iran" in Nov and Dec), shows a raw all-caps headline ("Israel CRIPPLES Iran's NUCLEAR PROGRAM") and includes unrelated events (UAE and Ethiopia sign a pact) on the tanker crisis (`t-hc-m4-3440x1440-01-desk.jpg`). The design asked for this subject's entries with their effect.
8. **Month 1 at 3440x1440**: about 570 px empty under the scene picture (no story yet in month 1, nothing fills the column) (`m1-hc-3440x1440-04-desk.jpg`).
9. **Phone touch targets under 44 px**: "i 1 name" 89x28, "How much?" 103x36, review "Open" 58x36, See all "Close" 82x31; at 1024x768 (touch) the state band controls are 36 px tall (`_scripts/log-tour-*-390x844.txt`, `log-phone-*.txt`).
10. **Phone See all sheet**: when the page scrolls, the sheet's heading and Close slide under the sticky top (`t-hc-m4-390x844-03-map.jpg`, `t-hc-m4-360x740-02-seeall.jpg`); See all in the top line still closes it.
11. **Phone chrome in month 1 at 360x740**: sticky top 165 px plus bottom bar 174 px (the leave line, the cue and Next) leave 401 of 740 px for the thing (`p-hc-m1-360x740-01-desk.jpg`).
12. **Phone catalogue**: the bottom bar shows "Skip below ↓" over the order list, a full-width cue about a Skip card the player is not looking for (`o-hc-m2-390x844-02-catalog-iran.jpg`); in month 1 with All orders open from the flat panel the thing line still says "1 of 3 · The January clock" (`r-390x844-m1-mil.jpg`).
13. **"Ask your staff" in context only on screens 1300 px tall and 1600 wide** (`layout.css` line 206); elsewhere only through Menu, Cabinet. Staff advice in words ("What your advisers say") likewise only on those screens; the cards keep their one-line recommendation.
14. **Quarantine China (Game Designer)**: "Your goals in this call: Iron discipline at home" names a goal that is not in the mission list; "Pay a third country to host them" says "Best for your mission" while the Interior Minister says "Seal the border" "is the answer that costs your mission least" (`x-qu-m2-3440x1440.jpg`).

### S4

- Escape does not close the See all panel on the desktop, and the panel stays open over the Map card after switching to Map (`t-hc-m4-1440x900-03-map.jpg`).
- Term game: "Mission: Win the coming election · Month 1 of 48" repeats the month already on the band.
- 1024x768 review: the Plan card has an empty band above Choose all (`t-hc-m4-1024x768-04-review.jpg`).
- Defense budget lost the old detail ("untouched ($ a month)", which orders use it).
- See everything has two amber buttons (Next month at the top, Diplomacy at the bottom).

## Verified good (on screen)

- No page scroll and no inner scroll on the month screen at 3440, 1920, 1440, 1366 and 1024 (desk and Map); no sideways scroll on phones; the phone page is the only scroll, with the below-the-fold cue counting answers ("3 more answers and Skip below").
- State band and mission line: one line at 3440 (64 px), content per size as designed, values equal the engine (political capital, orders, approval, stability, tension, score) on months 1 to 5; the phone state line plus "State ▾" sheet holds the mission, meetings, defense, your country, Cabinet, World, Chronicle, Codex, ticker, Settings, Save and load (`p-hc-m4-390x844-03-state.jpg`).
- Month 1 newcomer path (title, Take office, desk): goal sentence, "This month you have 3 things to go through. For each one, choose an answer or skip it. Then check what will happen and execute.", one Execute; the coach step 1 bubble covers no heading or control at 3440, 1920, 1366 and 1024 (`_scripts/log-m1coach-*.txt`); on phones it sits under the fold and the open call's leave sentence rides in the bottom bar until the badge is in view.
- Choose all recommended: count and breakdown match the list ("1 crisis answer, 2 orders, 3 meetings, 1 meeting for your ministers"); after pressing, "Nothing else to choose. Still open: General strike, The move for your mission" and "2 of your calls stay open"; the List rows turn to "Decided: ..."; the band updates in place (◆ 5 to 3, Orders 2 of 6, Meetings 3 of 3).
- Open calls: "No answer yet. If you leave it, the crisis passes with no effect" (before the deadline) and "No answer yet. If you leave it: Wait for the minehunters" (deadline month), amber dashed pill; the Plan's "If you execute now" says the same; the engine resolved "Wait for the minehunters (no decision taken)" and the result card says "Iran: Left open: Wait for the minehunters", See everything "Left open: Wait for the minehunters" (`t-hc-m4-3440x1440-05-result.jpg`, `-06-details.jpg`). Month 1's January clock left open passed with no entry.
- Setting on: the call starts on the Chief of Staff's answer and the Plan says "The Chief of Staff's answer to The January clock applies: More escorts, no strikes" and "The recommended order does not run (◆ 2 stay)" (`x-hc-chief-m1-1440x900.jpg`).
- Danger confirmations on phones: nuclear strike on Iran 348 px, whole between the sticky top (165) and the bar, title visible, both answers uncovered at 390x844 and 360x740; declare war on Venezuela 265 px, whole (`o-hc-m2-360x740-03-nuclear-face.jpg`, `o-hc-m2-390x844-04-war-face.jpg`). Adding an order updates the meters (◆ 5 to 4, Orders 0 to 1 of 6).
- Map mode at 3440 and 1920: card left with every answer and Skip, List under the card at 3440, layer bar, Plan float with Execute, nothing under the ticker; at 1440 and below the bottom bar with "Review 7 recommended", the consequence line and Execute.

## Carried conditions

| Condition | Status | Evidence |
|---|---|---|
| CA (coach over the phone list) | Met. Month 1 with an order of the player's own: no floater over the list at 390x844 or 360x740 (covered 0%); step 3 stands inline above Execute on the review screen | `_scripts/log-rows.txt`, `r-390x844-m1-mil.jpg` |
| C4 (6 rows per phone screen) | Met at 390x844 (6 whole rows with Diplomacy or Military at the top, coach on and off); 4 at 360x740 (the guard's floor) | `_scripts/log-rows.txt`, `r-*.jpg` |
| CB (tall faces on short phones) | Met on the phone for nuclear strike and declare war at 360x740. Mission-warning face and desktop faces not exercised (S1-1 hides Military at 1366x768) | `_scripts/log-orders-*.txt` |
| CC (end-of-list restore) | Not checked (iteration 5 order-card round) | |
| CD (keyboard badge on touch) | Not checked (iteration 5 order-card round) | |
| C-2 (engine advisers, Guide me line, certain-war wording) | Not met: S2-3. Guide me line and certain-war wording not checked | `t-hc-m4-3440x1440-01-desk.jpg` |
| C-3 (long pills, quotes, covered Remove) | Pills wrap cleanly on phones and fit on desktops; the covered "Remove" link on proposal cards not checked | |
| C2-2 (open crisis reads as the player's answer) | Met on the result card and See everything. The paper still writes "Trump answered 'Foreign interference' with 'Counter-intelligence sweep'" for a non-call crisis the cabinet answered by default (S4, wording) | `n-390x844-paper.jpg` |
| N-3 (leave wording, grey pill) | Met: "the crisis passes with no effect", amber dashed pill | `m1-hc-3440x1440-04-desk.jpg` |
| Phone month 1 leave line | Met: carried in the bottom bar (y677 to 731 at 390x844, 573 to 627 at 360x740) until the badge scrolls into view | `p-hc-m1-390x844-01-desk.jpg` |
| "A deputy goes" badge on a phone | Superseded: meetings show no selection pill in this build; the wording is now "Your minister takes it" (`ui/src/lib/month.ts` line 423) and was not seen on screen; skipping a meeting counts it done ("1 of 8 done") | `d-390x844-meeting-skipped.jpg` |
| C2-1, C-4 (Game Designer) | Not re-raised; not worse (setting on, Hormuz month 1 still shows the Chief's "More escorts" while the Foreign Minister's card is "Best trade-off") | `x-hc-chief-m1-1440x900.jpg` |

## Nothing removed (capabilities of the old desk)

Found: full desk view (Show: Everything; at D and up the List is always shown), staff advice (recommendation lines on every answer, the Plan's Recommended rows; the voices block on tall screens), ask your staff (in context on tall screens, Menu, Cabinet everywhere), budgets (state band: political capital, orders, meetings, defense), meetings (List rows; month 1 "See the meetings anyway"), see all orders (Your own orders, All orders, but see S1-1), map orders (Map mode), settings (Menu, Settings: staff orders, Chief of Staff calls, ticker, after each month, show me around again, help levels), help levels (Settings: Guide me / Some help / I know this; the "Some help" chip in the band). Not found as before: the defense budget's per-order detail (S4). Effectively lost by S1-1: browsing the full catalogue on the desk.

## Required changes (NOT APPROVED)

| ID | Owner | File hint | Change |
|---|---|---|---|
| S1-1 | this package | `ui/src/styles/layout.css` line 346, `ui/src/components/orders/OrderCatalog.tsx` | Family tabs with counts, or a signalled reading scroll as an interim; guard that every family is reachable at 1024, 1366, 1920 and 3440 |
| S2-1 | this package | `ui/src/styles/layout.css` lines 240 and 259, `ui/src/components/desk/AgendaList.tsx` | Fit rule for the List (compact, fold decided rows with a count); RS-008-1 measures the List after Choose all and the See all panel |
| S2-2 | this package | `ui/src/components/desk/ReviewPage.tsx` lines 86 to 101 | "Not decided": meetings say the minister's answer, recommended orders say they are not given unless chosen; a truth check against the turn report |
| S2-3 | this package | `ui/src/components/desk/YourMove.tsx` line 204 (`Advisers`) | Voices and the agree / disagree heading from the engine's call advisers, not `backedBy` |

Conditions after those land (owners): S2-4 the design pass (before the customer round); S3 items 1 to 13 the design pass (5 and 6 with WP-L2); S3 item 14 the Game Designer; CC and CD the iteration 5 order-card round; the S4 items the design pass.

## Verified on screen versus inferred

- Verified on screen (screenshot, DOM measurement or request and turn report): every finding above except where marked; the S1-1 overflow and wheel test; the List overflow numbers; the review wording against the saved turn report; the open-call sentences against the engine's "(no decision taken)"; the band numbers against the engine; the phone rows, faces and coach coverage.
- Inferred from code: the CSS causes named in the file hints; that the result card's ◆ 4 is the pre-filled cabinet answer (consistent with the engine's 6 and the Impeachment card's ◆ 2); the S2-4 cause; that the deputy badge was renamed.

## Not covered

- Guide me and I know this levels in play (only seen in Settings); the Chief of Staff's Guide me line (C-2).
- Desktop danger confirmations (my script could not press the tile's Add; S1-1 hides most danger tiles at 1366x768), the mission-warning face, Hold to authorize.
- Choose, Skip and Undo by mouse on the desktop beyond Choose all (Skip on a phone meeting only); auto-advance after Choose; a call left open before its deadline and checked again at its deadline month on the same save (checked on two different months instead: January clock passes, Tanker hit runs its default).
- The reveal, the codex drawer, 2560x1440 and 3840x2160 (beyond one List measure), keyboard order, contrast, reduced motion, real devices.
- Months beyond 5, the Term finale, and Quarantine beyond month 2.
