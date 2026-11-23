# Design review: stability-iter4 (D-81)

Reviewer: UX Designer and Art Director. Branch `stability-iter4` at 9025b5a (full verify passed), compared with the shared branch `dev/rc1-synthetic-loop` (cc4caeb, served by the shared dev server on 5173; the UI on the shared branch is identical to the merge base 55a6a39).
Seat: Ceasefire or Collapse, Ukraine, seed code CO-UKR-MAYA1, pinned through the RS-008 seat route. Branch served by its own servers (API 8091 with JSON saves in scratch, UI 5191).
Sizes: 3440x1440 (CEO, first), 2560x1440, 1920x1080, 1440x900, 1366x768 (one desktop session resized), 1024x768 (tablet session), 390x844 (phone session). States: month 1, result card, month 2 Desk, month 2 Map, month 3 (Map kept), last result card, reveal stages 0 to 7.
Method: `devloop/kit/layout-audit.mjs` with `layout-audit.config.mjs` (`game` and `result` configs) on both builds at the same states, plus screenshots read side by side.

## Verdict: CHANGES REQUIRED

Two items make the shared branch worse and must be fixed before merge. Everything else on the branch looks intentional and crafted.

## Required changes

1. **S2, AC-L6 / L-3: Execute month and Accept all are cut off on short screens in a month with several recommended items.** `ui/src/styles/staff-picks.css`, the new `@media (min-width: 900px) and (max-height: 820px)` block. It hides `.context-map` and sets `.rail` to `grid-template-rows: auto minmax(56px, 1fr) minmax(0, auto)`, which assumes the map is the first grid row. With the map hidden, the rail body falls into the `auto` row (558 px at 1366x768) and the rail foot into the `minmax(56px, 1fr)` row, so the foot gets 56 px and its `overflow: hidden` clips the Recommended group, Accept all recommended and Execute month (Execute measured at y 1249 on a 768 px window, unreachable: the page does not scroll and the foot does not scroll). Reproduced on month 2 (7 recommended) at 1366x768, 1024x768 and 1366x820; the shared branch shows Execute and Accept all at all three. Audit: `month-2-desk 1366x768` adds `state-visible: execute (below)` and 7 cut controls (shared: 0 such violation); `month-2-desk 1024x768` adds `collapsed-not-hidden: recommended (below), execute (below)`.
   Fix: give the rows for the map-hidden case explicitly (for example `grid-template-rows: minmax(56px, 1fr) auto` on `.rail:has(.staff-picks.v-rail .sp-list > :nth-child(2))`, or set `grid-row` on `.rail-body` and `.rail-foot`), then check that one whole Recommended item, Accept all and Execute are all on screen at 1366x768 and 1024x768 on CO-UKR-MAYA1 month 2. Add that state to a guard (RS-008 measures it, but RS-008 is open, so the verify gate did not see the break).
   Evidence: `design-review-stability/branch-month-2-desk-1366x768.jpg` vs `shared-month-2-desk-1366x768.jpg`; `branch-month-2-desk-1024x768.jpg` vs `shared-month-2-desk-1024x768.jpg`; `branch-probe-month2-1366x768.jpg`.

2. **S2, AC-L8 / L-1: the top bar runs off the window between 1366 and 1599 px, worse than before.** `ui/src/styles/hud.css`: the leader block now has `min-width: min-content` and the name wraps to two lines, which is good, but the block is about 60 px wider than the flag it replaces, and the bar has nothing that gives way. With the month deltas beside the stats (month 2 onwards) the Menu button is off screen at 1440x900 (shared: fully visible), and at 1366x768 Chronicle is half cut and Settings and Menu are off screen (shared: Settings half cut, Menu off). Month 1 at 1366x768 now cuts Menu too (shared: nothing cut). The commit says "the top bar fits the window"; it does not in this range.
   Fix: below 1600 px fold the secondary icon buttons (Chronicle, Settings, the drawers) into Menu, or drop the button labels ("Some help", "Map", "Desk") to icons, so the bar ends inside the window with the deltas shown at 1366 and 1440. The audit's `cutoff` count for `button.icon-btn "Menu"` must be 0 at 1366x768 and 1440x900, month 2.
   Evidence: `design-review-stability/topbars-branch-vs-shared.jpg` (pairs, branch first, at 1920, 1440, 1366, 1024), `branch-month-2-desk-1440x900.jpg` vs `shared-month-2-desk-1440x900.jpg`.

## Small items (S3, can follow)

- Phone 390x844: with the Map / Desk switch now in the bar (good, 44 x 44 each), the leader's name shortens to "Volodymyr Z..." (shared: full name). The name-wrapping rule only applies above 600 px; let the name wrap on the phone too, or drop the country line to a second row. `branch-month-2-desk-390x844.jpg` vs `shared-month-2-desk-390x844.jpg`.
- Reveal moments axis: labels now alternate above and below the line and never overlap (good), but a long label is cut with an ellipsis ("Keep Washington engaged (..."); the full goal is in the list below, so acceptable, ideally a shorter label. `branch-reveal-2-1366x768.jpg`.
- Not exercised by this seed and these states, so not judged: the UN vote board with 15 seats, the result-card stamp over a big number (no month here showed both), mission sheet "0 of 0", "Your view of X" card numbers. The visual baselines in verify cover them; they are not blocking.

## Per change

| Change | Judgement |
|---|---|
| Map mode kept month to month | Works: month 3 opens in Map on desktop, tablet and phone (shared returns to Desk). Map screen unchanged in layout; the Review 7 recommended and Execute strip reads well at 3440 and 1366. `branch-month-3-map-kept-3440x1440-CEO.jpg`, `branch-month-3-map-kept-390x844.jpg` |
| Map switch on phones, 44 px | Good: icon-only pair beside the menu, 44 x 44 targets, consistent with the other icon buttons. Costs the name room (S3 above) |
| Island near-miss taps | Not visible in screenshots; no layout effect |
| Leader name wrapping, flag gives way under 1600 | The two-line name is clean and reads as intentional at 1366 to 1599; the flag returning above 1600 is right. Required item 2 is the bar's overflow, not the name |
| More button chevron-only under 420 | Fine at 390 |
| Goal step on its own row | Under 1280 the step wraps to its own row instead of being cut ("UK relations 83, needs 93" is now whole at 1024 and 390, where shared cut it). It adds about 46 px of height at 1024, which contributes to item 1 at 1024x768 |
| Rail at 768 px keeping one Recommended item | Intent right, implementation breaks the rail (item 1) |
| Result-card stamp off the big number | No regression on the cards seen; the stamp-plus-number case did not occur in this run |
| Reveal axis labels never overlapping | Good (S3 note on truncation) |
| Flashpoint end not showing the election scene | Good: stage 0 of a flashpoint now shows the cabinet room, not the election projection (`branch-reveal-0-early-3440x1440.jpg` vs `shared-reveal-0-early-3440x1440.jpg`) |
| Score placeholder before counting | No flash of the final score seen in stage 0 or 1 captures |

## 3440x1440 (CEO) observations

- Month 1, month 2 Desk, Map and the result card are the same as on the shared branch: no new clipping, overlap or empty area. The name now reads in full ("Volodymyr Zelensky").
- The known RS-008 state holds and is not made worse: the desk is a 1180 px centre column with about 940 px empty on the left (used width 0.45), the rail on the right; the month 2 rail body scrolls (628 px hidden) and the stage scrolls (355 px); the result card is a 900 px dialog in the middle (used width 0.28); the reveal uses the left fifth of the screen. Map mode uses the full width (1.00) and is the best screen at this size.
- Two "Remove" links on the staff order cards are covered by the card's hit area at 3440 and 2560, same on shared (pre-existing).

## Layout audit summary (RS-008 stays OPEN, expected)

Violations per build, same seat and states (full tables: `design-review-stability/audit-*.txt`):

| State | Size | Shared | Branch | Difference |
|---|---|---|---|---|
| month-1 | 1366x768 | 2 | 2 | +1 cut control (Menu) |
| month-2-desk | 1440x900 | 2 | 2 | +1 cut control (Menu off screen) |
| month-2-desk | 1366x768 | 2 | 3 | new `state-visible: execute (below)`, 7 cut controls (item 1, item 2) |
| month-2-desk | 1024x768 | 0 | 1 | new `collapsed-not-hidden: recommended, execute (below)` (item 1) |
| month-2-map | 1440x900, 1366x768 | 0 | 0 | +1 cut control each (Menu, item 2) |
| all other rows (3440, 2560, 1920, 390; result card) | | same | same | none |

Totals: desktop 24 (shared) vs 25 (branch); tablet 0 vs 1; phone 0 vs 0.

Screenshots: `devloop/instances/world-conflict/runs/iter-04/design-review-stability/` (branch-*, shared-*, topbars-branch-vs-shared.jpg).

## Re-review (980b113): APPROVE WITH CONDITIONS

Same method, same seat (CO-UKR-MAYA1) and states, branch on its own servers (API 8092, UI 5192), compared with the shared 5173 captures above. Extra probe of the rail geometry at 1366x768, 1366x820, 1024x768, 1440x900, 1599x900 and 1600x900 on month 2 (7 recommended).

Required items:
1. **Rail foot clipped on short screens: fixed.** At 1366x768 the rail rows are `0 56px 562px`: the foot (Recommended group with one whole recommendation and its Accept answer / Change, Accept all recommended (7), Execute month) is fully on screen; same at 1024x768 (`0 56px 512px`) and 1366x820. Audit: `month-2-desk 1366x768` back to 2 violations (the RS-008 inner-scroll and below-fold ones the shared branch also has), no `state-visible`; `month-2-desk 1024x768` 0 violations (shared 0). `re-branch-month-2-desk-1366x768.jpg`, `re-branch-month-2-desk-1024x768.jpg`.
2. **Top bar overflow: fixed, and better than shared.** Below 1600 the secondary buttons fold into Menu; the bar ends inside the window with Map/Desk, Some help, sound and Menu. Cut controls: 0 at every desktop size and state (shared: Settings and Menu cut at 1366x768). At 1599x900 the folded bar is tidy; at 1600 and up, and at 3440, the full set of icons and the flag return, unchanged from shared. `re-branch-month-2-desk-1599x900.jpg`, `re-branch-month-2-desk-3440x1440-CEO.jpg`.

S3 items: the phone name now wraps to two lines ("Volodymyr / Zelensky") with the Map switch in place (`re-branch-month-2-desk-390x844.jpg`). Reveal label change not re-checked on this seed (the label that was cut is covered by the engineer's guard and the visual baselines).

Audit totals, shared vs branch: desktop 24 vs 24, tablet 0 vs 0, phone 0 vs 0; the branch has fewer cut controls than shared. RS-008 stays open as expected. Tables: `design-review-stability/re-audit-*.txt`.

3440x1440: unchanged from shared and from the first review (centre column with about 940 px empty on the left, RS-008), full top bar with flag, nothing new clipped or overlapping.

**Open point (rail body cut to 56 px on short desktop rails):** acceptable until the D-80 layout build replaces the rail, because political capital stays always visible in the top bar ("6 left" with the seals) and the rail's heading and count ("Political capital 6 of 6 left") stay readable. Condition (follow-up, S3): the 56 px row slices the seal row in half under the Recommended group, which looks accidental. Either size the row to the heading line only (about 44 px, seals hidden) or to heading plus seals (about 96 px), so the cut lands on a clean edge. Track it under WP-L1 so the layout build does not inherit it.

Conditions: the 56 px rail-body edge above. No other condition.
