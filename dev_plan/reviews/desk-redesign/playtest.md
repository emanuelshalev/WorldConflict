# Desk redesign: hands-on playtest

Date: 2026-11-02. Build: working tree with the Map/Desk split (`Desk.tsx`, `desk/*`, `month.ts`, `staff.ts`,
`budget.ts`, `ContextMap.tsx`). Driven with Playwright (headless Chromium) against the running dev servers.
Screenshots: `dev_plan/reviews/desk-redesign/playtest/`.

Coverage: Nora (USA Term, 1366x768) played months 1-4; Dan (Israel Term, 1920x1080) played months 1-4 on
one save plus 3 fresh month-1 saves for over-budget and default tests; Jo (Taiwan, Flashpoint "Quarantine",
390x844 touch) played months 1-4. No `pageerror` events. One console error (see P2-12).

Test caveat: headless Chromium renders WebGL in software. With the globe mounted under the desk, the page
ran at about 1 fps and a click took 10-13 s (see P1-6). For the functional desk tests I hid `.map-stage`
in Desk mode with an injected style (marked "fast" below). Map mode, reload and ticker tests were run
without it.

## Nora (newcomer, 1366x768, United States)

> "OK, the left list is my to-do, the right side is what I'm doing. I like that the big orange button
> is always there. But my staff already spent all my diamonds, the top bar says I have three and the
> right says zero left of two, and after I pressed Approve one meeting still says it's waiting. Did I
> do it wrong? Also, which of those two little icons in the top bar is the map?"

- First desk (`nora-01-first-desk.png`): the whole desk fits, nothing scrolls, Execute sits at the
  bottom of the rail with Approve right above it. The readiness list ("1 crisis on staff pick / 4
  meetings waiting / 2 orders queued, 2 by staff") answers "what do I need to do". Good.
- Staff spent all political capital every month (`◆ 0 left of 2`, months 1-4: `nora-01`, `nora-06`,
  `nora-12`, `nora-14`). The HUD `CAP` shows the bank (3 diamonds, later 2 of 3) while the rail shows
  what is left after orders and crisis costs. Two different numbers for "capital" on one screen.
- Approve 4 (`nora-02-after-approve.png`): confirmed the crisis and filled the 3 meeting slots. The 4th
  meeting (Defence Minister) stays "Suggested" in the navigator and the readiness line still says
  "1 meeting waiting: a deputy goes if not approved", now with no Approve button. She thought she had
  missed something.
- Budgets update live: switching the Gaza crisis answer and removing a staff order moved the meter
  from `0 left of 1` to `1 left of 1` and "Orders 1 of 6" to "0 of 6"; attending Burnham moved
  "In person" to 1 of 3 and the slot row showed his flag (`nora-08-edited.png`).
- Reload kept every pick (crisis answer, removed order, attended meeting) (`nora-09-after-reload.png`).
- The 2D map follows the focus: US to Iran arrow for the Iran crisis, Gaza for the Gaza crisis, the UK
  for the Burnham call (`nora-07-meeting-detail.png`). She found it reassuring ("oh, that's where").
- At 1366 the HUD `Map | Desk` control shows icons only (labels hidden below 1440 px), and navigator
  rows truncate hard ("Iran nears ...", "Supreme ...", "Prime Mi...").
- Crisis option header: the `−◆1` cost overlaps the title "Coordinate sanctions and talks" (`nora-01`,
  `nora-02`, same card, two runs).
- Map mode (`nora-03`, `nora-04-map-guide.png`): the bottom strip keeps the numbers and Execute; she
  played month 3 entirely from the strip and it worked. The Map Guide panel runs under the strip: its
  last rows ("Flames ...", "Protest ...") are hidden behind it.
- The month-1 desk has no ticker at all (no newspaper yet) though the HUD broadcast toggle is "on".
  From month 2 the ticker sits on its own bottom row and never covers the rail (`nora-06`).
- The outcome reel at 768 px high: the scene frame overlaps the top half of the `Next` button
  (`nora-05-chronicle.png`, `nora-10-reel.png`).

## Dan (veteran, 1920x1080, Israel)

> "J/K, 1-2-3, Shift+A, Ctrl+Enter: I can do a month in five keys, nice. Search is great when it
> works. But my staff spend every diamond before I touch anything, so the first thing I try gets
> 'not enough political capital'. And they queued a 5% ceasefire for me. No Del, no G, no arrow keys
> in the search like the help promised."

- J/K walk crisis, meetings, staff suggestions and orders in navigator order; the 2D map and the detail
  follow (`dan-02-j-meeting.png`). Pressing 1-3 on a crisis switches the answer, the tag becomes
  "Your call" and the capital meter updates at once (`-1 left of 2` for "Negotiate", back to `0 left of
  3` for the others).
- Over budget on purpose (`dan-07-over-capital.png`): the meter turns red, the last ◆ order is marked
  "Will be refused: not enough capital", Execute is disabled with "Over political capital by 1: remove
  an order" right above it, Ctrl+Enter does nothing. In Map mode the strip shows `◆ -1 left` and a
  disabled Execute, but the reason is only in the tooltip (`dan-07b-over-capital-map.png`).
- You cannot push over budget with orders: `queueOrder` refuses any ◆ order beyond what is left with a
  toast (`dan-06-refused-toast.png`). Only crisis/meeting answers can push you over.
- While over budget the Approve button disappears even though 4 free meetings are still waiting
  (`misc-approve-gone-over-capital.png`).
- Search: `/`, "spy iran", Enter queued "Spy on Iran" (`dan-11-readd-0.png`). Up/Down to pick a
  different hit is not implemented: Enter always takes the first hit. Under load the `/` focus
  (a 30 ms `setTimeout`) sometimes landed late; the typed letters then went to the global shortcuts
  ("n" toggled the ticker, "j"/"k" moved focus) (`dan-03-search.png`: empty but focused box, ticker
  toggled off).
- Trying to add an order that is already queued while at 0 capital says "Not enough political capital"
  instead of "already on your desk" (twice).
- Shift+A behaves as expected and respects his own picks: a crisis he had changed with "3" stayed on
  his answer (`dan-08-after-shiftA.png`). Same leftover as Nora: after Shift+A, "1 meeting waiting"
  remains every month (`dan-12-month-0.png`, `dan-12-month-1.png`).
- N toggles the ticker; Hide on the bar and the HUD broadcast button both work; the choice survived two
  reloads. Picks survived reload too.
- Staff defaults in 4 months: "Spy on Iran" every single month, "Mobilize forces" once, and in month 4
  "Propose ceasefire to Iran" at 5% odds (`dan-13-month4.png`). He called that presumptuous.
- Not implemented from spec 3.10: `G` (legend), `Del` (remove focused tray row), `Enter` (approve
  focused suggestion), Up/Down in search. After Execute focus is on `body`, not the navigator.
- At 1920 the detail column leaves the lower half of the screen empty (`dan-12-month-1.png`); the rail
  has a large gap above Approve. Not a bug, but room for the staff "why" or the preview.

## Jo (phone commuter, 390x844, Taiwan Flashpoint)

> "The bottom bar is perfect: diamonds, orders, meetings, then Approve and Execute under my thumb.
> But the top bar is huge, the tip talks about left and right on a phone, and I can't tell from the
> chips which ones are done."

- Collapsed sheet (`jo-01-first-desk.png`): line 1 `◆ 0 left · Orders 3/6 · In person 0/3`, line 2
  `Map | Approve 4 | Execute month`. Always visible, no horizontal scroll (document width 390).
- The HUD takes 137 px (name row, icon row, stats row) versus 48 px in the spec, about 16% of the
  screen. The coach tip ("Left ... Middle ... Right ...") takes another 84 px and is wrong on a phone.
- Tapping the sheet's top line expands it with the 2D map, budgets, tray and readiness
  (`jo-03-sheet-open.png`). The sheet body scrolls internally (448 px of content in 255 px), so the
  readiness list needs a scroll (`jo-05-sheet-scrolled.png`). The sheet background lets the crisis
  text show through faintly behind the budgets.
- Removing a staff order from the sheet updated line 1 immediately (`◆ 1 left · Orders 2/6`).
- Chips: the status tags (Staff pick / Suggested / You attend) are hidden on phone; only a small dot
  remains, so Jo could not tell what was settled without opening each.
- The 2D context map is hidden until the sheet opens (spec: 96 px strip by default).
- Approve and Execute worked from the sheet for 3 months (`jo-10`, `jo-11`, `jo-12`). Ticker is off by
  default on phone, as specified.
- Outcome reel on phone (`jo-08-chronicle.png`): a small scene at the top and ~500 px of empty dark
  space; `Next` is reachable.
- Map mode (`jo-13-map-mode.png`, `jo-14-map-guide.png`): the strip fits 390 px. The Map Guide covers
  nearly all of the map and its bottom runs under the strip, as on desktop.

## Issues

No P0 found: every month could be played to the end with the intended result, on all three sizes.
Each item below was reproduced at least twice unless marked "unconfirmed".

### P1 (confusing or clumsy)

1. **Approve all leaves a meeting "waiting".** Did: Approve N / Shift+A with 4 meetings. Got: 3 slots
   filled, the 4th stays "Suggested" and readiness says "1 meeting waiting: a deputy goes if not
   approved", with the Approve button gone. Expected: Approve all settles the calendar (remaining
   meetings explicitly to a deputy, or the line reads "Calendar settled, 1 to a deputy"). Seen 4 times
   (Nora m1, Dan m2-m3, Jo m1). Area: `approveAll()`/`pendingApprovals()` in `ui/src/lib/month.ts`,
   `Readiness` and navigator tags (`waiting = !choices[m.id]`).
2. **Staff spend all political capital every month.** Did: open any month. Got: `◆ 0 left` before the
   player touches anything (all personas, every month); the first order the player adds is refused.
   Expected: staff leave at least 1◆ free, or the rail says "Staff used your 2◆, remove one to choose
   your own". Area: `setupMonth()` in `ui/src/lib/month.ts` (`capitalLeft` check), coach tip copy.
3. **Two capital numbers.** HUD `CAP` shows the bank (3 diamonds / "3/6"), the rail shows what is left
   after crisis costs and orders ("0 left of 2"). Seen on every screen. Expected: one meaning, or the
   HUD reflects queued spending. Area: `ui/src/components/Hud.tsx` stat, `budgetStatus()` in
   `ui/src/lib/budget.ts`.
4. **Map Guide runs under the command strip.** Did: Map mode, Guide. Got: the guide panel (z-index 7)
   extends below the strip top (z-index 20), hiding its last rows; on phone it also covers almost the
   whole map. Seen at 1366, 1920 and 390. Expected: guide docked above the strip (spec 3.1 / step 7:
   320 px right column, `--under-bottom`). Area: `ui/src/components/MapGuide.tsx`, `MapView.tsx`, `wc.css`.
5. **Approve disappears while over capital.** Did: pick a crisis answer that costs ◆ so `left < 0`.
   Got: Approve button vanishes while 4 free meetings are waiting. Cause: `if (cost > pc) continue`
   with `pc = -1` skips even 0-cost meetings. Expected: free meetings still approvable. Area:
   `pendingApprovals()` in `ui/src/lib/month.ts`.
6. **The globe keeps rendering under the desk.** Measured: Desk mode 1 fps and 10-13 s per click
   (1366 and 1920); hiding `.map-stage` gave 56 fps and 245 ms clicks. Software GL exaggerates this,
   but on a real laptop it is wasted GPU and battery the whole time the player is on the desk.
   Expected: pause or unmount the map in Desk mode. Area: `ui/src/App.tsx` (`MapView` always mounted),
   `MapView.tsx` render loop.
7. **Map/Desk control is icon-only below 1440 px.** At 1366 Nora could not tell which icon was the map.
   Spec 3.1 asks for labels. Area: `wc.css` `@media (max-width: 1439px) { .mode-seg span { display: none } }`.
8. **Phone HUD is 137 px, and the coach tip is wrong on phone.** Spec 3.9: 48 px HUD. The tip says
   "Left / Middle / Right". Together they push the first option below the fold. Area: `Hud.tsx` phone
   variant, `CoachTip` in `ui/src/components/Desk.tsx`.
9. **Staff queue low-odds orders and the same order every month.** "Propose ceasefire to Iran" at 5%
   (Dan m4, seen once, unconfirmed; code has no odds filter), "Spy on Iran" queued 4 months running
   (Dan) and 3 of 4 (Nora). Expected: skip orders under ~30% and rotate repeats. Area: `setupMonth()`
   in `month.ts`, `computeSuggestions()` in `ui/src/lib/staff.ts`.
10. **Spec keys missing.** `G` (legend), `Del` (remove focused tray row), `Enter` (approve focused
    suggestion), Up/Down in the order search (Enter always takes hit 1). Verified by key press (G, Up)
    and code (`useDeskKeys` in `Desk.tsx`, `CatalogDetail` in `desk/Detail.tsx`).

### P2 (polish)

1. Crisis option cost `−◆1` overlaps a long title at 1366 ("Coordinate sanctions and talks"). Area:
   `.option .opt-pc` in `wc.css`, `desk/Detail.tsx`.
2. Navigator labels truncate heavily at 1366 (240 px column). Consider two-line rows or a wider column.
3. `/` focuses the search via a 30 ms `setTimeout`; under load keystrokes reach the global shortcuts
   first (N toggles the ticker). Seen 2 of 4 tries in software GL only. Focus synchronously
   (`flushSync` or an effect in `CatalogDetail`). Area: `useDeskKeys` in `Desk.tsx`.
4. Duplicate order at 0 capital reports "Not enough political capital" instead of "already on your
   desk". Check duplicates before capital in `queueOrder()` (`ui/src/store/gameStore.ts`).
5. Map-mode strip: when Execute is disabled the reason is only a tooltip. Show it inline. Area:
   `CommandStrip` in `desk/CommandRail.tsx`.
6. Month 1 shows no ticker (empty newspaper) while the HUD toggle reads "on"; N appears to do nothing.
   Area: `Ticker` in `App.tsx` (render a placeholder or disable the toggle).
7. After Execute, focus is on `body`, not the navigator (spec 3.10).
8. Tray crisis line reads "Who will police Gaza?: Commit ..." (double punctuation). Area: `Tray`.
9. Phone: chips hide status tags; add a short state word or colour. Context map hidden until the
   sheet opens (spec: 96 px strip). Open sheet background lets text show through. Readiness needs a
   scroll inside the open sheet.
10. Outcome reel: at 1366x768 the scene frame overlaps the top half of `Next`; on phone the scene is
    small with ~500 px empty below. Area: `OutcomeReel` styles.
11. "Staff pre-select orders" off applies from next month only (current staff orders stay queued);
    say so in the setting text. Area: `SettingsModal.tsx`.
12. Console: React duplicate key in the Chronicle causes list (`key={c}`, two identical "Iran exposes
    United States spy operation" lines). Seen once (unconfirmed). Area: `ui/src/components/Chronicle.tsx`.
13. At 1920 the detail leaves half the screen empty and the rail has a tall gap; room for the order
    preview or staff reasoning.

## What works well (keep)

- The three-column desk fits without page scroll at 1366x768 and 1920x1080; Execute and Approve are
  always in the same place, the selection list is always next to them.
- The readiness checklist plus the navigator dots answer "what do I still need to do".
- Budgets update instantly for orders, crisis answers and meetings; the over-budget state is clear
  (red meter, "Will be refused" on the exact order, reason above a disabled Execute, Ctrl+Enter blocked).
- Staff crisis picks plus "Your call" tags: easy to see what you decided versus what staff decided;
  Shift+A never overrides a player choice.
- Keyboard flow J/K, 1-3, Shift+A, Ctrl+Enter, M, N works as documented.
- Pending picks survive reload exactly; ticker visibility is remembered; the ticker never covers the rail.
- The 2D context map follows every focused item and helps place a crisis or a call at a glance.
- Map-mode strip has real parity: a whole month was played from it.
- The phone bottom sheet (budgets line, Map, Approve, Execute) is thumb-friendly and never clipped.

## Fixed after this playtest

- P1-1, P1-5: Approve all settles the whole calendar (best three in person, deputies for the rest) and works while over capital; free meetings are never skipped.
- P1-2, P1-9: staff queue at most two orders, always leave 1 ◆, skip orders under 35% odds and repeats of last month.
- P1-3: the HUD shows capital left this month, the same figure as the rail.
- P1-4: the Map Guide ends above the command strip; on phones it is a lower sheet capped at half the map.
- P1-6: the globe stops animating and painting while the desk covers it.
- P1-7: Map/Desk labels stay visible down to 1200 px wide.
- P1-8: phone HUD is two rows (83 px, was 137); the coach tip says Top/Below/Bottom sheet on phones.
- P1-10: G (legend), Delete (remove focused order), Enter (approve focused staff pick or suggestion), Up/Down in order search.
- P2-1, 3, 4, 5, 6, 8, 11, 12: cost tag no longer overlaps titles, `/` focuses search synchronously, duplicate orders say so first, the Map-mode strip shows why Execute is disabled, the ticker shows a placeholder on month 1, no double punctuation in the tray, the Settings text explains when the staff toggle applies, Chronicle list keys are unique.
- Not done yet: P2-2 (navigator truncation at 1366), P2-7 (focus after Execute), P2-9 (phone context strip), P2-10 (outcome reel overlap), P2-13 (use of empty space at 1920).
