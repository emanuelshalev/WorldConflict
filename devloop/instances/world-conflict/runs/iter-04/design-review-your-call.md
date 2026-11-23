# Design review: build-your-call (D-84 engine side, D-81 review)

- Reviewer: UX Designer and Art Director (fresh reviewer, judged on the built screen)
- Branch and commit: `build-your-call` at a15c338 (full verify gate passed), against `dev/rc1-synthetic-loop`
- Servers: the running dev servers of this checkout (UI :5173, API :8080); not restarted
- Seats: Quarantine as China (seed 4242); Water War as India (seed 4242); Hormuz Convoy as the United States (seed 4242); Ceasefire or Collapse as Ukraine (seed code CO-UKR-MAYA1); layout audit on Caracas After Maduro as the United States (seed code CA-USA-OLIV1, the RS-008 guard seat)
- Sizes: 3440x1440 (owner), 1920x1080, 1440x900, 1366x768, 1024x768, 390x844; the audit also measured 2560x1440 and 3840x2160
- Method: Playwright kit sessions (`_scripts/`, reusing `scenarios-qa/regressions/_lib.mjs` `startGame` and `pinSeat`); screenshots and DOM probes per size; the POST `/api/turn` request body captured to see which crisis answers the client actually sends, and `worldState.turnReport.decisions` read to see what the engine resolved; the RS-008 layout audit guard run unchanged; the shared and branch visual baselines `desk-m2-full-1440` compared. Evidence: `design-review-your-call/`.

## Verdict: CHANGES REQUIRED

One S1: in this build a "Your call" crisis is left without an answer, the desk keeps telling the player it will go ahead on the recommended answer, and the engine then resolves the default (skip) answer instead. Verified on three seats and five months; in two of them the answer that really runs costs a primary goal. Everything else is merge-worthy or a condition for `build-agenda-layout`. The fix is small and local to `ui/src/lib/month.ts` (see RC-1).

## Item 1: Settings rows (all six sizes)

Judgement: acceptable, one wording change.

- Both rows render in the Your desk group in the same pattern as their neighbours, no horizontal scroll at any size. Desktop and tablet: 3 lines each at 666 px; phone: 6 lines ("Staff propose orders") and 5 lines ("Let the Chief of Staff make my calls") at 308 px (`probe-settings-*.txt`).
- Hit size on the phone: the native checkbox is 13x13 px, but the whole `label.setting-row` is the target (308x102 px for the new row; tapping the checkbox centre lands in the label). Same as every other row; fine.
- "Staff propose orders ... up to three safe orders" matches `STAFF_ORDERS = 3`.
- New row: "Let the Chief of Staff make my calls" reads well. The definition says "Accept all recommended also decides each Your call: the Chief of Staff takes the card ...". In this build there is no element called "Your call" anywhere on the desk (probed on every month: `"Your call" on screen: false`), so a newcomer cannot tell what turning it on does. "Off by default" is also redundant in a setting that shows its state. See RC-4.
- Evidence: `settings-390x844.jpg`, `settings-rows-1440x900.jpg`, `settings-rows-3440x1440.jpg`, `settings-1024x768.jpg`.

## Item 2: Quarantine as China, five primary goals

Judgement: the five-goal layout holds at every size; one punctuation defect on the phone; the way to act on the new goal is buried in month 2 (RC-2).

- Goal line: "3 of 5 on track · month 1 of 12", five segments plus two bonus dots, no overflow at any size (`.goal-line` scrollWidth equals clientWidth everywhere; phone 113 px tall, two rows, same as a four-goal seat). Month 2 step chip "This month: Bring Taipei to the table: -89, needs -55" fits on one line on desktop and wraps to two clean lines on the phone. `chn-m1-3440x1440.jpg`, `chn-m2-390x844.jpg`.
- "Your goal" sentence: "You win if all five hold at the end of month 12: ... bring Taipei to the table (relations kept above -55) and score of 120+." One line at 3440 (49 px), two at 1920, three at 1440 and 1366, 218 px on the phone. Readable. On the phone the comma after "(relations kept above -88)" is left alone at the right edge of its own line (`chn-m1-390x844.jpg`): the long goal unit wraps and the glued comma does not follow it. This comma exists only because the fifth goal was added (four goals ended "... -88) and score of 120+"). S3, RC-5.
- "How you win: read your goal" chip: unchanged, fits.
- Mission list in the Full desk rail (month 2, 1440 and 1366): five rows, the Taipei row "Bring Taipei to the table / Bring Taipei to the table: -89, needs -55" is readable; the rail pushes Crises and Meetings down by one row, nothing is cut (`chn-m2-full-1440x900.jpg`). The repeated goal name in the status line is pre-existing (same on "Washington still talking"), S4.
- A way to act on it: the engine offers "Court Taiwan" as the mission move (`probe-chn-desktop.txt`: "For your mission: Court Taiwan"). In this build that move is a "Your call" with no screen, so it is not a staff proposal. Month 1: it is the third visible row of Orders to consider and the "Big move" banner names it ("Put ◆ 3 into your mission: Court Taiwan + Reform program"). Month 2: the three upkeep proposals (Court Russia, Reform program, Court United States) take all three visible rows and Court Taiwan sits behind "Show 2 more", while the goal line says "This month: Bring Taipei to the table" (`probe-chn-orders-1440x900.txt`, `chn-orders-m2-1440x900.jpg`). The meeting "Reassure: no threat intended" (call with President Lai) is in Recommended with "Helps: Bring Taipei to the table", so the goal is not invisible, but the one order that moves it is folded away. See RC-2.
- Balance note for the Game Designer (not a design finding): Taiwan relations went from -80 to -89 in month 1 on "Keep it on paper" with no move, so waiting falls further behind faster than the decision note's estimate.

## Item 3: Water War as India, month 1 opening crisis

Judgement: the classification fix shows on the cards and the cards stay choosable; the "why the advisers agree" story is only half told in this build (condition C-2), and one badge is clipped (RC-6).

- Recommended answer: "Covert action and a dossier" (Intelligence Chief: "Quiet operations against the network and evidence to every capital."). Engine: mission card and calm card are both Covert, default Covert, so what the desk says is what runs on this seat.
- Both strike cards carry the red ribbon "! Breaks: No full-scale war with Pakistan" (+3 more / +2 more); Covert carries "! Hurts: No full-scale war with Pakistan +2 more". The Breaks versus Hurts difference is the visible reason; all three cards are pressable (`ind-m1-1440x900.jpg`, `ind-m1-3440x1440.jpg`).
- "War is certain": on the crisis cards the word is "Breaks", which reads as certain. The new sentence "Pakistan is a nuclear power: striking it means war, failing ..." is in `missionWarning`, which the UI shows only for orders (order confirm face, Detail, action preview), not on crisis cards. Not exercised on screen; read in code (`src/core/preview.ts`).
- Why the advisers agree: the Guide me line "Your advisers agree on Covert action and a dossier. The others cost you: ..." exists in the advice but no component renders it in this build. What the player sees instead is mixed: the rail warns "1 recommended answer works against your mission: Covert action and a dossier", and the "Strike the camps" card footer says "Backed by the Defense Minister and the Chief of Staff" (authored `backedBy`), while the engine's call card gives that strike no adviser. A newcomer reads: the Chief of Staff backs the war, the recommended answer hurts my goal. They can still work it out from Breaks versus Hurts, but it is not the clear "least harm" story D-84 wants. Condition C-2 for the month screen branch.
- The recommended badge on Covert reads "Recommended · best trade-off: helps Washington sees it India's way, costs No full-scale war with Pakistan and Score of 117+": four lines in `.wc-card-tag`, its first line is cut off under the adviser row at 1440x900 (`ind-m1-1440x900.jpg`). The component is shared-branch code (the badge text is the engine's mission note), but this branch is what puts the long trade-off note on India's flagship card. S3, RC-6.

## Item 4: "Your call" crises, Accept all and the Recommended panel in this build

Judgement: misleading. This is the S1.

What the build does with a crisis the engine marks as a call (`advice.calls`, kind crisis):
- `setupMonth` no longer pre-fills an answer for it (`ui/src/lib/month.ts`, the `calls.has(d.id)` branch), and `pendingApprovals` leaves it out of Accept all.
- Nothing on the screen replaces it: the crisis card still shows "Recommended: <cabinet pick>", the navigator row says "Recommended", the rail plan says "Recommended answer on 1 crisis", the phone sheet says "This month you will: Pay a third country to host them · Recommended", and the Recommended panel's own definition says "a crisis goes ahead on its recommended answer unless you change it".
- On Execute the client sends no answer for it, so the engine resolves `defaultOptionId`, which is the call's Skip answer, and the report marks it "(no decision taken)".

Measured (POST `/api/turn` body and turn report, `probe-accept-all-*.txt`):

| Seat, month | Desk says (Recommended) | Engine resolves | What that costs |
|---|---|---|---|
| Hormuz Convoy USA, month 1 | Reply via Muscat | More escorts, no strikes | Skip text: "It costs Voters stay on side" |
| Hormuz Convoy USA, month 2 | Meet their demands | Break the strike ("no decision taken") | "It costs Voters stay on side" |
| Ceasefire or Collapse UKR, month 1 | Reject it and strike | Only by referendum | "It costs Keep Washington engaged" |
| Ceasefire or Collapse UKR, month 2 | Subsidize fuel | Ride it out ("no decision taken") | (no goal named) |
| Quarantine CHN, month 2 | Pay a third country to host them ("good for your mission") | Seal the border ("no decision taken") | (no goal named) |
| Quarantine CHN, Water War IND, month 1 | Keep it on paper / Covert | same (pick equals default) | none |

Month 1 has no Accept all on the Focus desk, so this happens there even if the player presses nothing but Execute; in month 2 pressing Accept all makes it worse in words: the button turns to "Nothing to accept: every recommendation is decided" while the call is still undecided (`usa-aa-m2-after-1440x900.jpg`, `chn-aa-m2-after-1440x900.jpg`). On the shared branch every crisis was pre-filled with the staff pick, so the desk's words and the outcome agreed.

Other checks:
- Counts agree with lists: "Accept all recommended (7)" lists 7 items (CHN month 2, USA month 2), "(6)" lists 6 (UKR month 2); the engine `routine` length matches. The breakdown line ("1 crisis answer, 2 orders, 3 meetings, 1 meeting for a deputy") matches the list.
- No text on the desk names a "Your call" element; only the Settings row does (item 1).
- Interim state on the shared branch: not coherent enough as built. The player is never told that Accept all skipped the crisis, and is told the opposite of what will happen. The smallest fix keeps the D-84 rule (Accept all does not decide a call) and makes the words true: RC-1.

Evidence: `usa-aa-m1-before-1440x900.jpg`, `usa-aa-m2-after-1440x900.jpg`, `ukr-aa-m1-before-1440x900.jpg`, `chn-aa-m2-before-1440x900.jpg`, `chn-m2-sheet-390x844.jpg`, `baseline-branch-desk-m2-full-1440.jpg` (navigator: "General strike ... Recommended").

## Item 5: three staff proposals on the month 2 Desk

Judgement: fits about as well as the shared branch; the third proposal costs one more row in already scrolling lists; one stale sentence.

- Baselines `desk-m2-full-1440` (Hormuz USA): shared shows "Accept all recommended (8)" with 2 crisis answers; branch shows "(7)" with 1 crisis answer (the General strike call left out, see item 4) and the same two proposals (this seat gets two). The Recommended panel shows one full item and the start of the next above Accept all in both; Execute stays on screen. `baseline-shared-desk-m2-full-1440.jpg`, `baseline-branch-desk-m2-full-1440.jpg`.
- Three proposals (CHN month 2): at 1440x900 and 1366x768 the panel shows "Recommended 7", one and a half items, Accept all and Execute on screen (`chn-m2-1440x900.jpg`, `chn-m2-1366x768.jpg`); Orders to consider shows the three proposals first ("3 shown · 3 of them recommended"), see RC-2. Phone: the plan sheet lists the 7 items from y1397 to y2489 in an 844 px screen, Accept all at y1709 (the sheet scrolled to "This month you will" first), same pattern as before plus one row (`chn-m2-sheet-390x844.jpg`).
- The hint at the top of Orders to consider still says "The staff propose up to two of these" (`ui/src/components/desk/Detail.tsx` line 92, visible in `baseline-branch-desk-m2-full-1440.jpg`) while Settings says three. S3, RC-3.
- Full desk at 1440: the adviser quote "Finance Minister: Expensive and cynical." wraps one word per line and runs under the "Recommended: Pay a third country to host them" pill (`chn-m2-full-1440x900.jpg`); on the phone the same pill is cut at the right edge (`chn-m2-390x844.jpg`). Long option labels, shared-branch component, not caused by this branch: S3 for `build-agenda-layout` (C-3).

## Item 6: layout audit, month 1 and month 2 Desk, all sizes

Judgement: no new violation type; month 2 slightly worse in proportion to the third proposal; RS-008 unchanged at the owner's size.

- Run: the RS-008 guard unchanged, seat CA-USA-OLIV1, 8 viewports (`audit-rs008-ca-usa.txt`, shots `audit-ca-usa-*.jpg`). 32 measurements, 29 violations.
- Month 1: identical used width to `design-review-stability/re-audit-branch-desktop.txt` (3440 0.45, 2560 0.60, 1920 0.80, 1440 0.96, 1366 0.95). Inner scroll 1920 128 px (126 before), 1440 167 px (144), 1366 299 px (305). The shared branch has since given this seat a fifth goal ("all five" in the sentence), so the small differences are not this branch.
- Month 2 Desk: the seat now gets three proposals (Court Mexico, Spy on Iran, Mobilize forces) against two at the stability review. Below the fold at 3440: 31 (25 before); hidden px 1835 (1570); covered controls 3 (2): the pre-existing "Remove" link under each proposal card's hit area now occurs once per proposal. 1440: 2746 px hidden (2397), 49 below (43). 1366: 2887 (2604). The month 2 crisis also differs (the shared branch moved on), so not all of the growth is this branch. Map mode: clean at every size, as before. Phone and tablet: every region expanded or collapsed, no rule broken.
- RS-008 at 3440 (width 0.45, inner scrolling) is owned by `build-agenda-layout` and is not made worse in kind; the covered Remove link is condition C-3.

## Required changes

| ID | Severity | File, selector | Problem | Concrete fix |
|---|---|---|---|---|
| RC-1 | S1 | `ui/src/lib/month.ts` `setupMonth` (the `if (calls.has(d.id))` branch) and `crisisSelection`; `ui/src/components/desk/StaffPicks.tsx` `MainButton` (n === 0 text) | A call crisis gets no answer, the desk says it goes ahead on "Recommended: X", the engine runs the Skip answer; Accept all then says "every recommendation is decided" | Smallest: when `chiefCalls` is off, still pre-fill the call with the answer the desk shows (`choices[d.id] = crisisStaffPick(d, world.objective, pc).id`, paying its pc and price like the other crises), and keep it out of `pendingApprovals` as now. Then "goes ahead on its recommended answer unless you change it" is true again and Accept all still does not decide it. Change the n === 0 sub-line to say what is left when a call is open, for example "Accepted. Still yours: <crisis title>" (or "Nothing to accept" only when no call is open). Add a guard: for every pending crisis, the answer the desk labels equals the answer sent in POST /api/turn or the engine default. The honest Skip display ("No answer yet: if you skip, <skip label>, <cost>") belongs to the month screen branch |
| RC-2 | S2 | `ui/src/components/desk/AdvisorList.tsx` (Orders to consider order and its "Show n more" fold) | With three upkeep proposals the mission move (Court Taiwan on Quarantine China) falls behind "Show 2 more" in month 2 while the goal line names its goal; on the shared branch the mission order was itself a proposal | Keep the engine's mission move (`advice.calls` kind move, `missionCard` `order:0`) in the visible rows: list it first (or right after the proposals, never folded), with its "Helps: <goal>" tag. Acceptable as a condition instead if `build-agenda-layout` lands before the next customer round |
| RC-3 | S3 | `ui/src/components/desk/Detail.tsx` line 92 `p.hint` | "The staff propose up to two of these" contradicts Settings ("up to three") and `STAFF_ORDERS = 3` | "up to three" (or derive from `STAFF_ORDERS`) |
| RC-4 | S3 | `ui/src/lib/glossary.ts` `TERMS.chiefCalls.definition` | Refers to "each Your call" and "the card", which do not exist in this build; "Off by default" is redundant | Interim wording without the missing term, for example: "When on, Accept all recommended also answers the crises your advisers disagree on (the answer that serves your mission, or the calm one when political capital is short) and adds the first order for your mission." Restore the term when the month screen ships |
| RC-5 | S3 | `ui/src/components/desk/GoalLine.tsx` `MissionLine`, `.mission-goal-unit` | On the phone the comma after the fourth goal is stranded at the right edge of its own line | Keep the comma inside the last line box of the goal (for example `display: inline` on the unit with the comma in a no-break span with the last word, instead of an inline-block unit) |
| RC-6 | S3 | `ui/src/components/game/CardShell.tsx` `.wc-card-tag` (styles `game.css`) | A long mission note ("best trade-off: helps ..., costs ... and ...") makes a four-line tag whose first line is clipped under the adviser row (India month 1, 1440x900) | Clamp the tag to two lines with the full text in the title or the card's detail, or shorten the note to "Recommended · least harm" when more than one goal is named |

## Conditions (owners)

- C-1, Group Manager and Builder: RC-1 lands on this branch before merge; RC-2 lands here or the merge of `build-agenda-layout` follows before any customer round.
- C-2, `build-agenda-layout` (UX Designer to review): the Your call screen must render the engine's adviser names (`CallCard.advisers`) instead of the authored `backedBy` footers on call crises, show the Guide me line ("Your advisers agree on ... The others cost you: ..."), and show the certain-war wording on the strike cards where the player chooses them.
- C-3, `build-agenda-layout`: long recommended pills and adviser quotes collide at 1440 Full desk and are cut on the phone; the "Remove" link under each proposal card is covered (3 per month now); RS-008 width and inner scrolling as already owned.
- C-4, Game Designer: Quarantine China relations with Taiwan fell 9 points in month 1 with no move (balance note, item 2).

## What I did not exercise

- The "Let the Chief of Staff make my calls" setting turned on (what Accept all then decides): read in code only (`setupMonth` step 3, `approveAll`).
- A mission side answer with a price paid on screen (capital seals after choosing a priced card); read in code (`capitalLeft`).
- The new `missionWarning` sentence on the airstrike order against Pakistan (order confirm face): read in code only.
- Guide me and I know this help levels (all runs at the default Some help).
- Month 1 and 2 at 1024x768 and 390x844 on India, USA and Ukraine (China only at those sizes); Map mode beyond the audit.
- No shared-branch build was run; shared-branch comparisons are its committed baseline image and the earlier audit tables.
