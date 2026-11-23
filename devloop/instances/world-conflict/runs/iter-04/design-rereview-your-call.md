# Design re-review: build-your-call (D-84, D-81 review, second pass)

- Reviewer: UX Designer and Art Director (fresh reviewer, judged on the built screen)
- Branch and commit: `build-your-call` at 6fba0a5 (working tree clean apart from `loop/` and this review)
- Servers: the running dev servers of this checkout (UI :5173, API :8080); not restarted; one browser at a time
- Seats: Hormuz Convoy as the United States (seed 4242), Quarantine as China (seed 4242), Water War as India (seed 4242)
- Sizes: 3440x1440, 1440x900, 1024x768, 390x844 (mobile emulation), 360x740 (mobile emulation)
- Method: Playwright scripts in `design-rereview-your-call/_scripts/` (`truth.mjs`, `layout.mjs`, `phone.mjs`, `phone2.mjs`, `misc.mjs`, `calls.mjs`, with their text logs). For the desk truth check each month: the API load (pending crises, `advice.calls`, `advice.chief`), the text the desk shows for each crisis, the POST `/api/turn` body, the engine's `turnReport.decisions`, the result card and the "See everything" page, the bank before and after. Every screenshot below was looked at.

## Verdict: NOT APPROVED (one required change, small)

The S1 is fixed: on both seats, months 1 to 3, setting off and on, with and without Accept all, what the desk says will happen to each crisis is what Execute sends and what the engine and report then show. What blocks the merge is new and caused by this package: on the phone the sentence that RC-1 relies on, "No answer yet. If you leave it: ...", is wider than the screen and is cut at the right edge (month 1 loses "...given and the crisis passes", month 2 loses the answer's name, "Break the str"). One CSS change fixes it (RC2-1). Everything else can merge as is or with the conditions below.

## 1. The first review's required changes

| ID | Result | Evidence (in `design-rereview-your-call/`) |
|---|---|---|
| RC-1 (S1) | Fixed on the desk and in the engine; the only remaining issues are the phone clipping (RC2-1) and wording around it (N-2, N-3) | `truth-usa-off-m1-desk.jpg`, `truth-usa-off-m2-desk.jpg`, `truth-usa-off-acc-m2-after-accept.jpg`, `truth-usa-off-acc-m2-everything.jpg`, `truth-chn-off-m2-desk.jpg`, `truth-usa-on-acc-m2-after-accept.jpg`, logs `_scripts/truth-*.txt` |
| RC-2 (S2) | Fixed. China month 2: "Orders to consider (5) · 3 shown · 2 of them recommended"; rows Court Russia, Reform program, Court Taiwan ("Helps: Bring Taipei to the table", Add); "Show 2 more" below | `rc2-chn-m2-orders-1440x900.jpg` |
| RC-3 (S3) | Fixed. Full desk Orders to consider hint reads "The staff propose up to three of these ..." (read from the DOM; the hint is above the scrolled view in the screenshot) | `rc3-chn-m2-full-orders-detail-1440x900.jpg`, `_scripts/misc-chn-orders.txt` |
| RC-4 (S3) | Fixed. "When on, the crises your advisers disagree on start on the Chief of Staff's answer (...) and Accept all recommended also accepts them; the Chief of Staff also proposes the first order for your mission. Fully in effect from the next month." No "Your call", no "Off by default". Fits at all five sizes, no sideways scroll. Turning it on mid-month changes the open call to the Chief's pick at once, so "Fully in effect from the next month" is true only of the order part (S4) | `rc4-settings-*.jpg`, `rc4-settings-turned-on-midmonth-1440x900.jpg` |
| RC-5 (S3) | Fixed. Phone goal sentence on China: each comma stays on the line of its goal's last word at 390 and 360 ("-88)," together) | `rc5-chn-m1-390x844.jpg`, `rc5-chn-m1-360x740.jpg` |
| RC-6 (S3) | Fixed. India month 1: the tag is one line "Recommended · best trade-off" (24 px tall at 1440 and 3440, two lines at 1024), nothing cut; "Strike the camps" and "Hit their air bases" (both "Breaks: No full-scale war with Pakistan") no longer name backers; Covert keeps "Backed by the Intelligence Chief and the Foreign Minister" | `rc6-ind-m1-1440x900.jpg`, `rc6-ind-m1-3440x1440.jpg`, `rc6-ind-m1-1024x768.jpg` |

### RC-1 measured (desk, sent, engine, report)

| Seat, month, setting | Desk says | Sent | Engine report |
|---|---|---|---|
| Hormuz USA m1, off | "No answer yet. If you leave it: no answer is given and the crisis passes"; plan "No answer yet on 1 crisis" | nothing | no entry (crisis gone next month) |
| Hormuz USA m2, off (with and without Accept all) | General strike: "No answer yet. If you leave it: Break the strike"; Foreign interference: "Recommended" then "Accepted: Counter-intelligence sweep"; after Accept all the button says "Nothing else to accept. Still open: General strike" | sweep only | "Break the strike (no decision taken)", "Counter-intelligence sweep" |
| Hormuz USA m3, off | India's offer (not a call): "Recommended: Sign it" | accept | "Sign it" |
| Hormuz USA m1, on | "Recommended: More escorts, no strikes" (Chief's pick) | escort | "More escorts, no strikes" |
| Hormuz USA m2, on + Accept all | "Accepted: Meet their demands" (Chief's pick), "Accepted: Counter-intelligence sweep" | concede, sweep | same |
| Quarantine CHN m1, off | "No answer yet ... the crisis passes" | nothing | no entry |
| Quarantine CHN m2, off | Refugees: "No answer yet. If you leave it: Seal the border"; Full desk navigator tag "No answer yet" | nothing | "Seal the border (no decision taken)" |
| Quarantine CHN m3, off | "Recommended: Abstain" | abstain | "Abstain" |
| Quarantine CHN m1 to m3, on + Accept all | "Recommended: Keep it on paper", then "Accepted: Subsidize fuel", "Accepted: Abstain" | same | same |

- No crisis card is shown as selected while none is chosen: with no answer, no card carries the ACCEPTED or YOUR PICK stamp or the dashed outline; the stamp appears only on a chosen answer (`truth-usa-on-acc-m2-after-accept.jpg`).
- Seal meters agree with the engine on every run: the bank after resolve equals "left" on the meter plus the month's income (for example Hormuz on, month 2: bank 6, meter "1 of 4 left" after Accept all with Meet their demands' price of 1, the engine left 4 = 1 + 3).
- The leave sentence is true. Read in code (`src/core/turn.ts` resolveDecisions, `src/core/crises.ts` runDirector): an unanswered crisis before its deadline resolves nothing and the director replaces the month's crises, so it does pass; from the deadline month the default answer runs. On screen, nothing about the January clock or How tight a squeeze? appears in month 2 or in the report.

## 2. Is the open call understandable?

- Desktop and tablet (3440, 1440, 1024), months 1 and 2: the line is in view without scrolling on the crisis card's adviser row (1440 m1 at y496, m2 at y412; 1024 m1 at y589; 3440 m1 at y653), not covered, not clipped (`lay-usa-*-m1.jpg`, `lay-usa-*-m2.jpg`). The plan line in the rail agrees ("No answer yet on 1 crisis, ..."), the Full desk navigator shows an amber "No answer yet" tag (`rc3-...jpg`), the phone sheet lists "No answer yet / General strike. If you leave it: Break the strike / Open" (`phone-usa-390x844-m2-sheet.jpg`).
- Phone (390x844, 360x740): month 1 the line starts below the fold (y855 and y860; the five-goal sentence and the coach tip take the first screen, `lay-usa-390x844-m1.jpg`). Month 2 it is in the first screen at 390 (y639) and just under the bottom bar at 360 (y652, behind Execute until you scroll). In both months it is cut at the right edge: the pill keeps its full width (534 px in month 1, 362 px in month 2) inside a 390 or 360 px stage that hides the overflow (`phone-usa-390x844-m1-badge-v.jpg`: "... no answer is g", `phone-usa-390x844-m2-badge-v.jpg`: "... Break the str"). RC2-1. This is the C-3 pill problem from the first review, but now it hits every phone game in month 1 and hides the one sentence that tells the truth, so it is worse and is raised again.
- Wording: "No answer yet. If you leave it: no answer is given and the crisis passes" says "no answer" twice and a newcomer may read "passes" as "goes on to next month". Suggested: "No answer yet. If you leave it, the crisis passes with no effect." S3 (N-3). The grey outline pill is the quietest element on the row; on a desk where every other crisis state is amber or green it reads as a disabled control rather than a question waiting for you. S3, for the month screen.
- What still implies an answer is chosen when none is:
  - The Recommended panel's definition, on screen next to an open call, still says "a crisis goes ahead on its recommended answer unless you change it" (`truth-chn-off-m2-desk.jpg`, `truth-usa-off-acc-m2-after-accept.jpg`). With the Recommended tag on "Pay a third country to host them" and "Meet their demands", a newcomer can read that sentence as "that answer will run". The badge says otherwise on the same screen, so nothing hidden happens, but two statements disagree. S3, N-2, one string in `ui/src/lib/glossary.ts` line 110.
  - Setting ON, Hormuz month 1: the pill says "Recommended: More escorts, no strikes" (the Chief's pick, calm side) while the card tag "Recommended · best trade-off" sits on "Reply via Muscat" and the rail warns "1 recommended answer works against your mission: More escorts, no strikes" (`truth-usa-on-acc-m1-desk.jpg`). Two different answers are called Recommended. The engine data (`_scripts/calls.mjs` output): mission card oman (price 1), calm card escort, chiefPick escort; the bank is 3 and nothing is accepted, so "the calm one when political capital is short" (the Settings text) looks wrong to the player. Inferred from `src/core/advisors.ts` line 1306: the Chief's budget is computed after the staff proposals' cost, which the player has not accepted. S2, carried as condition C2-1 (setting is opt-in and off by default; the outcome shown is what runs).
  - Report wording (pre-existing, not this package's code): a crisis left open is shown on "See everything" as "Trump's answer: Break the strike", and the result card says "You chose: Counter-intelligence sweep" for an answer the player never pressed (`truth-usa-off-acc-m2-everything.jpg`, `truth-usa-off-m2-report.jpg`). The engine marks "(no decision taken)" but the UI drops it. S3, condition C2-2.

## 3. Other findings at every size

- No sideways page scroll at any size (document scrollWidth equals the viewport). The phone desk stage hides its own overflow, which is what cuts the pill (RC2-1).
- Coach tip "This is your move this month. Pick one. Step 1 of 3" covers the crisis art and the LIVE tag only, not the leave line, at all sizes (`lay-usa-1440x900-m1.jpg`, `lay-usa-390x844-m1.jpg`).
- Rail tray slot text "General strike. If you leave it: Break the strike" is truncated with an ellipsis in the slot (268 px in a 185 px box at 1440); it is inside the rail's own scroll and the full sentence is on the card. S4.
- "Break the strike" card footer says "Backed by the Chief of Staff" at 3440 while the Chief of Staff's pick (setting on) is "Meet their demands" (`lay-usa-3440x1440-m2.jpg`). This is the authored `backedBy` problem tracked as C-2; not worse, noted only.
- Leaving the month 1 call costs nothing (India's existential crisis, Hormuz, Quarantine): already with the Game Designer, not re-raised.

## Required change

| ID | Severity | File, selector | Problem | Fix |
|---|---|---|---|---|
| RC2-1 | S2 (blocks: first phone screen of every game, hides the RC-1 sentence) | `ui/src/styles/month.css` line 323 `.stage-staff .sel-badge { flex: none; }` and line 328 (phone `margin-left: 46px`) | The selection pill never shrinks or wraps; the leave sentence runs past the right edge at 390 and 360 and is clipped by `.desk-stage` | Let it wrap within the row on narrow screens: `flex: 1 1 auto; min-width: 0; max-width: calc(100% - 46px); white-space: normal;` (text left-aligned, the pill grows in height). Check 390x844 and 360x740 months 1 and 2 on Hormuz, plus the long "Recommended: Pay a third country to host them" on Quarantine month 2. Optional: a phone assertion in D84-DESK-TRUTH that the `.sel-badge` right edge is inside the viewport |

## Conditions (owners)

- C2-1, Game Designer and the new month screen package: with "Let the Chief of Staff make my calls" on, the Chief's pick can differ from the card tagged Recommended and be flagged "works against your mission" (Hormuz month 1). Decide whether the Chief's budget should count unaccepted staff proposals (`src/core/advisors.ts` about line 1306); the month screen shows one recommendation per call with its reason ("calm: political capital is short").
- C2-2, new month screen package: a crisis left open reads "Trump's answer: X" on See everything and the result card says "You chose" for answers that went ahead by default; show "Left open: X" (the engine already marks "(no decision taken)").
- N-2, this package if the branch is touched again, else the month screen: Recommended panel definition (`ui/src/lib/glossary.ts` line 110) to say "a crisis goes ahead on its recommended answer unless you change it; a call your advisers disagree on waits for you".
- N-3, this package if touched again, else the month screen: leave text "If you leave it, the crisis passes with no effect" (`ui/src/lib/month.ts` `leaveText`); give the open state a visible "needs you" color.
- Unchanged and still open: C-2 to C-4 of the first review, RS-008.

## Verified on screen versus inferred

- Verified on screen (screenshot, DOM text, request body or report JSON): every row of the RC-1 table; RC-2 to RC-6; the meters against the engine bank; positions and clipping at the five sizes; the coach tip; the Chief's pick on setting on; the report wording.
- Inferred from code: that an unanswered crisis before its deadline really does nothing (turn.ts and crises.ts, consistent with what the screens and report show); why the Chief picks the calm card on Hormuz month 1 (advisors.ts budget after staff proposals); the CSS cause of RC2-1.
- Not exercised: Ukraine and India beyond month 1; Guide me and I know this help levels; Full desk at 3440 beyond month 2.

## Confirmation pass (c254058)

- Code: `build-your-call` at c254058 (RC2-1 in 7480661 with guard D84-BADGE-FIT; N-2 in c254058), served by the running dev servers. One browser, no server or product changes.
- Scripts and logs: `design-rereview-your-call/_scripts/confirm.mjs`, `confirm2.mjs`, `confirm-*.txt`, `confirm2-*.txt`. Screenshots `cf-*.jpg` (phone) and `cf2-*.jpg` (tablet, desktop, setting on).

### RC2-1 badge on the phone: fixed

Measured `.sel-badge` box, clipping by any ancestor that hides overflow, and the element hit at its left, right, top and bottom edges (all four "ok" means nothing covers it). Hormuz USA and Quarantine China, months 1 and 2, setting off.

| Size | Badge | Box | Lines | Clipped or covered |
|---|---|---|---|---|
| 390x844 | "No answer yet. If you leave it: no answer is given and the crisis passes" (both seats, month 1) | 64 to 376 | 2 | no |
| 390x844 | "No answer yet. If you leave it: Break the strike" / "... Seal the border" (month 2) | 64 to 376 | 2 | no |
| 390x844 | "Accepted: Pay a third country to host them" (China month 2, longest answer label picked) | 64 to 376 | 2 | no |
| 360x740 | month 1 leave sentence (both seats) | 64 to 346 | 3 | no |
| 360x740 | month 2 leave sentence | 64 to 346 | 2 | no |
| 360x740 | "Accepted: Pay a third country to host them" / "Accepted: Meet their demands" | 64 to 346 / 64 to 338 | 2 / 1 | no |

- Look: a rounded box (18 px corners) in the same grey outline, left-aligned text, two or three lines, inset 46 px under the adviser's line; it reads as part of the adviser row and stays readable (`cf-usa-390x844-m1.jpg`, `cf-chn-360x740-m1.jpg`). The green "Accepted: Pay a third country to host them" wraps to two clean lines (`cf-chn-360x740-m2-picked-longest.jpg`). Acceptable.
- Picking the longest answer label gives "Accepted: ..." rather than "Your pick: ..." because on both seats the longest label is the recommended answer. On China it is the longest badge text the desk produces this month, so it stands in for the long "Your pick" case.
- Above the fold: month 1 the badge still starts below the first phone screen (y855 at 390x844), below the five-goal sentence and the coach tip; one short scroll shows it whole. Month 2 it is in the first screen at 390 (y639). Not a defect any more now that it is readable; keep for the month screen (C-3 family).
- After Accept all on the phone (plan sheet): "Nothing else to accept. Still open: General strike" (Hormuz, setting off, call left open), or "Nothing to accept: every recommendation is decided" once the call was answered first (`cf-usa-390x844-m2-sheet-after-accept.jpg`, `cf-chn-390x844-m2-sheet-after-accept.jpg`). Both true. The sheet, its plan line and its Recommended box fit with no sideways scroll.
- A deputy badge ("A deputy goes"): not reached on screen. On the phone Focus desk the meetings are not stages I could open by script, and at 1440 the meeting I opened from the Full desk navigator showed "Staff would answer: Promise full support" (one line, pill, unchanged, `cf2-usa-1440x900-m2-meeting.jpg`). D84-BADGE-FIT's whole-text pattern includes "A deputy goes"; I did not check it on screen.
- 1024x768 and 1440x900: no visible change. At 1024 the new rule applies (corner radius 18 px instead of 999 px), but the badge is one line 36 px tall, so it is still a full pill; "No answer yet. If you leave it: Break the strike" at 81,506 as before (`cf2-usa-1024x768-m2.jpg`). At 1440 the rule does not apply (radius 999 px, one line, same positions as the first re-review).

### N-2 Recommended sentence: true and understandable

New text: "Your advisers recommend these for this month. Orders and meetings wait for you to accept; a crisis listed here goes ahead on its recommended answer unless you change it, one not listed is yours to answer."
- Setting off, Hormuz month 2 (390 sheet, 1440 rail): the list holds Foreign interference ("goes ahead unless you change it") and not General strike, which has the "No answer yet" badge. The sentence matches what happens.
- Setting on, Hormuz month 2 (1440): the list holds "Crisis answer: Meet their demands, Crisis: General strike · goes ahead unless you change it" (the Chief's pick) and Foreign interference. Both go ahead and are sent (first re-review, truth runs). True (`cf2-usa-1440x900-on-m2.jpg`).
- After Accept all the list is empty ("Recommended 0") and the sentence then says an unlisted crisis is yours to answer, while the accepted ones are already decided by their "Accepted" badges. Minor; the badges settle it. Reads clearly. The comma before "one not listed" is a comma splice; a semicolon or "and one" would read better (S4).
- The sentence shows only where the panel shows its first-use line (phone sheet, 1440 rail); at 1024 the rail panel shows no definition. Not new.

### Conditions after this pass

- RC2-1 and N-2: closed.
- C2-1 (Game Designer and the new month screen package): unchanged. With the setting on, Hormuz month 1 still shows "Recommended: More escorts, no strikes" on the pill and "Recommended · best trade-off" on Reply via Muscat (`cf2-usa-1440x900-on-m1.jpg`).
- C2-2 (new month screen package): unchanged (report says "Trump's answer: X" for a crisis left open).
- N-3 (this package if touched again, else the month screen): unchanged ("no answer ... no answer" wording; grey pill reads as passive).
- C-3 family (new month screen package): month 1 phone badge starts below the first screen; deputy badge not checked on screen.
- Still open from before: C-2 to C-4 of the first review, RS-008.

Verdict: APPROVED WITH CONDITIONS: C2-1 (Game Designer, new month screen package), C2-2 (new month screen package), N-3 (this package if touched again, else new month screen package), month 1 phone badge below the first screen and an on-screen check of "A deputy goes" (new month screen package); C-2 to C-4 and RS-008 as already owned.
