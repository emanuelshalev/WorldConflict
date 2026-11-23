# Design: a layout that uses the screen (D-80, RS-008)

Owner: UX Designer, reviewed by the Art Director and the Game Designer (D-81: design leads, this spec is the gate for the iteration-4 agenda build). Status: ready for build. Supersedes the QA3-S3-3 inner-scroll fix (`ui/src/styles/staff-picks.css`, the Recommended list scrolling inside the rail) and section 8 of `../iter-03/design-agenda.md` (layout per breakpoint). Everything else in `design-agenda.md` section 0 (round 2 and 3: the guided agenda, the wording set, AF-1 to AF-15) and `design-order-cards.md` stays as designed; this document only says where things go and how they grow, fold and fit.

Primary sizes (D-80, the CEO plays at 3440 x 1440 at 100 % zoom): **3440 x 1440**, 1920 x 1080, 1366 x 768 and 390 x 844. Also designed and checked: 1024 x 768, 1440 x 900, 2560 x 1440, 3840 x 2160.

## 0. The mocks (3440 x 1440 first)

Built by `concepts/layout-build.py` (CSS `concepts/layout.css`, content and visual language from the round 3 agenda mocks), screenshots and the layout audit by `layout-shots.mjs`:

```
python3 devloop/instances/world-conflict/runs/iter-04/concepts/layout-build.py
node devloop/instances/world-conflict/runs/iter-04/layout-shots.mjs        # 24 shots + concepts/layout-audit.json, exit 1 on a failure
```

| Size | Desk, month 4 (Xi Jinping calls, 5 recommended still to do) | Desk, month 1 (simple desk) | Map mode, month 4 |
|---|---|---|---|
| **3440 x 1440 (CEO)** | `concepts/layout-desk-m4-3440x1440.png` | `concepts/layout-desk-m1-3440x1440.png` | `concepts/layout-map-3440x1440.png` |
| 3840 x 2160 | `layout-desk-m4-3840x2160.png` | `layout-desk-m1-3840x2160.png` | `layout-map-3840x2160.png` |
| 2560 x 1440 | `layout-desk-m4-2560x1440.png` | `layout-desk-m1-2560x1440.png` | `layout-map-2560x1440.png` |
| 1920 x 1080 | `layout-desk-m4-1920x1080.png` | `layout-desk-m1-1920x1080.png` | `layout-map-1920x1080.png` |
| 1440 x 900 | `layout-desk-m4-1440x900.png` | `layout-desk-m1-1440x900.png` | `layout-map-1440x900.png` |
| 1366 x 768 | `layout-desk-m4-1366x768.png` | `layout-desk-m1-1366x768.png` | `layout-map-1366x768.png` |
| 1024 x 768 | `layout-desk-m4-1024x768.png` | `layout-desk-m1-1024x768.png` | `layout-map-1024x768.png` |
| 390 x 844 | `layout-desk-m4-390x844.png` (+ `-full.png`) | `layout-desk-m1-390x844.png` (+ `-full.png`) | `layout-map-390x844.png` (+ `-full.png`) |

All paths are under `devloop/instances/world-conflict/runs/iter-04/concepts/`. The mocks are one responsive page each (the laptop tree) plus the phone tree, as the build will be (WP-A2: the phone is its own component tree).

**Self-check result: 24 of 24 pass** (section 10 lists the measures). Two audits agree:
- `layout-shots.mjs` (the AC-L measures below): no inner scroll region at any size of 1024 x 768 and up, no page scroll, no control out of view, covered, overlapping or clipped, exactly one Execute button, text never under 15 px, horizontal coverage 0.93 to 0.95 on the desk at every size (Map: the map fills the width), every region filled to 0.96 to 0.98 of its height at 1920 x 1080 and up; on phones every answer below the fold is announced by the bottom-bar cue with its count.
- The kit's `devloop/kit/layout-audit.mjs` (branch `build-layout-audit`) with `layout-audit-mocks.json` (output in `concepts/kit-layout-audit.txt`): 24 measurements, 0 violations; used width 1.00 at every size; every region expanded or collapsed with a visible summary, none missing. For comparison, its iteration-3 baseline at 3440 x 1440: the month uses 45 % of the width (943 px empty each side) and month 2 has 3 inner scrollers hiding 1495 px and 24 controls below the fold.

## 1. Problem (RS-008)

CEO, on a very large monitor: "a central piece with wasted space on the sides. I can scroll to see more things at the bottom, but it is unclear that such things exist [...] the one on the right with political capital: I have a massive screen and that section is scrolling within a tiny space [...] Important things like state should be visible and should have a dedicated space."

What the code does (iter-3, `ui/src/styles/desk-stage.css`, `staff-picks.css`):
1. `.focus-view` and `.v-full .detail` are `max-width: 1180px; margin: 0 auto`: one centre column at every size, the sides empty.
2. `.desk-stage { overflow-y: auto }`: the month continues below the fold inside a scroll box with no signal.
3. `.rail` is a fixed 360 px column; `.rail-body { overflow-y: auto }` and, after QA3-S3-3, `.sp-list` scrolls inside the rail foot (`max-height: 26vh / 40vh`): the Recommended list, political capital and Execute share a small box that scrolls even on a huge screen.
4. State (political capital, budgets, orders used) lives in the rail body, so it scrolls away with it; month and mission are on another line (`GoalLine`).
5. Nothing scales with the screen: a 3440 x 1440 monitor at 100 % shows the same 16 px column as a laptop.

## 2. Rules

**L-1. Five regions, always.** The game screen is made of: **State** (the state band), **Bar** (the month bar: where you are, Back, Next, See all, Check and execute), **List** (the month's things), **Thing** (the current thing: the situation, the answers, its context) and **Plan** (what will happen, Recommended, Accept all recommended, Execute). Map mode adds the **Map** under them. A region is either shown in full or collapsed visibly (L-13); it is never absent without a visible way to it.

**L-2. Grow by columns, not by line length.** Width is spent first on more regions side by side, then on more columns inside the Thing (L-7), never on longer lines or a wider centre column. There is no `max-width` with `margin: auto` on any region of the game screen.

**L-3. One root size, scaled by the short side.** `html { font-size: clamp(16px, calc(0.42vmin + 11.5px), 22px) }` (phones fixed at 16 px root, 17 px body). Every layout size is in rem: 16 px up to 1080 tall, 17.5 px at 1440 tall (2560 x 1440, 3440 x 1440), 20.6 px at 2160 tall. A big screen gets a bigger game, not an emptier one. Ultrawide screens (3440 x 1440) scale like 2560 x 1440 and spend their extra width on regions (L-2).

**L-4. Reading width.** Running text (quotes, background, story, briefing, codex) is at most `38rem` (about 70 characters) per block. Where a column is wider than that, the column gets another block beside it or a full-width element (a picture, a card, a map) instead of longer lines.

**L-5. The state band is dedicated and always visible.** One band under nothing, above everything, at every size: never scrolls, never covered, never inside another region. Contents in section 5. It replaces the HUD and the goal line (`Hud.tsx`, `GoalLine.tsx`); political capital and the budgets leave the rail.

**L-6. No inner scrolling for what the player must see or act on** at 1024 x 768 and larger (the brief asked for 1366 x 768; the mocks show it holds at 1024 x 768 too, so the bar is set there). The page itself does not scroll either. The only scroll regions allowed are the reading regions in section 7, each marked `data-scroll="reading"` and signalled.

**L-7. The Thing lays itself out by its own width** (container query on the Thing region, not the viewport):

| Thing width | Layout |
|---|---|
| under 38rem | one column: situation, question, answers stacked |
| 38 to 56rem | one column: situation on top, answers in 2 columns |
| 56 to 96rem | two columns: the situation (scene, goals in this call, how it got here) / the question and the answers stacked |
| 96rem and wider | three columns: the situation (scene, how it got here) / the answers (and what your advisers say) / the context (subject map, your goals in this call, background, Read in the codex) |

**L-8. Short screens (820 px tall or less) compact in a fixed order**, never by scrolling: (1) the scene band drops to 8.5rem and loses its quote line (the quote stays on the phone and in Review); (2) the Thing goes to "situation on top, answers in 2 columns" whatever its width; (3) optional blocks leave (goals in this call, how it got here, advisers, background: their facts are also on the answer cards); (4) month 1: the intro sentence moves into the month bar ("0 of 2 done. Choose or skip each, then check and execute."); (5) tablet only (under 1280 wide): the scene band becomes a text header (kicker and title on one line, no picture), Execute drops its sub-line in the bar.

**L-9. The Plan region order is fixed:** "What will happen", Decided (n), Recommended (n) still to do with its rows, **Accept all recommended (n)** with its definition line, Skipped (n); then, pinned to the bottom of the region and never folded: "If you execute now:" (1 to 3 bullets) and **Execute month N** ("ends the month"). Budgets are not in the Plan (they are State, L-5).

**L-10. The fit rule (supersedes QA3-S3-3).** When the Plan sections do not fit above the Execute block, the build applies these steps in order until they fit, re-run on every resize and every change of the plan (a ResizeObserver on the Plan list): (1) fold Skipped; (2) compact rows (drop the effect sub-lines of Decided and Recommended rows); (3) fold Decided; (4) fold Recommended. A folded section keeps its heading with the count, a one-line summary ("Xi call, Takaichi visit, small meetings, 2 orders (◆ 3)") and a **Show** button; Show opens it and folds the others (accordion). **Never folded, never scrolled:** the Recommended heading with its count, Accept all recommended, its definition line, the Execute block. The list never gets `overflow: auto`.

**L-11. Below 1280 wide the Plan becomes a bar** under the Thing, the same bar as Map mode's strip: "☰ Review n recommended" (opens the Plan as a panel over the Thing, with Accept all inside it, D-72 D4), then a divider, "If you execute now:" in one line, Execute. One primary button in the bar (Execute).

**L-12. Fill the height.** On screens 900 px tall or more and 1600 wide or more, every column reaches the bottom of its region: the scene keeps a 16:9 picture shape and the column under it is "How it got here" (a timeline whose entries spread over the height); answer cards share the answers column height and show their detail line (from 1200 tall); "What your advisers say" joins the answers column from 1300 tall; the context map grows; the List ends with "Your mission" (from 1200 tall); the Plan's Execute block sits at the bottom. Nothing is stretched past its reading width (L-4) and no box is empty below its content by more than 15 % of the region (AC-L10).

**L-13. Collapse visibly.** Whatever is not shown in full shows a visible summary with a count and a control that opens it: the List as "See all 6 ▾" and "2 of 6: Xi Jinping calls / 1 done, 5 to go" in the bar; a folded Plan section as its heading, count, summary and Show; the Plan bar as "☰ Review 5 recommended"; the state details on phones as "State ▾"; answers below the fold on phones as the cue "2 more answers and Skip below ↓". Nothing is ever only below the fold.

**L-14. Map mode keeps the desk's places.** The State band and the Bar are the same. The Thing is a card on the left over the map (width `clamp(24rem, 28vw, 40rem)`, top to bottom of the map area at most, compacting by L-8, never scrolling); from 1600 wide the Plan floats on the right with the same content and the same Execute place as the desk; under 1600 the Plan is the bar of L-11 at the bottom. From 2240 wide and 1200 tall the List sits under the Thing card; otherwise it is behind "See all 6 ▾". The map's camera centres the subject in the visible gap between the card and the Plan (map padding = the panels' widths).

**L-15. Phones (700 wide and under) are their own tree** (WP-A2 `desk/PhoneMonth.tsx`), one thing per screen: a sticky top with the state line ("Month 4 · ◆ 3 of 6 · Orders 0 of 6", "State ▾") and the thing line (Back, "2 of 6 · Xi Jinping calls / 1 done, 5 to go", See all); the thing scrolls with the page (the only page scroll in the game); a sticky bottom with the cue (L-13, live count of answers below the fold or under the bar, pressing it scrolls to the first) and the one button (Next, or on the review screen and in Map mode Execute with its consequence line). No inner scroll regions on phones either (sheets size to their content up to the screen; a sheet longer than the screen is a page with its own cue).

**L-16. One Execute button on screen** (phone desk: none until the review screen, AC-21 of the agenda design). One primary (filled amber) button per region.

**L-17. Text floor and targets stay:** nothing a player reads under 15 px (AC-22), controls at least 44 x 44 px at 390 and 1024 wide, 36 px for small buttons in dense rows on pointer screens (AF-9).

**L-18. No truncation, no overlap.** No button text is cut with an ellipsis (AF-13), no control's content spills out of its box, no two controls overlap (a squeezed column must not draw rows over each other: list rows never shrink, `flex: none`).

**L-19. One component per region, many forms.** The Plan is one component with forms `rail` (desk 1280 wide and up), `float` (Map 1600 and up), `bar` (desk under 1280, Map under 1600) and `sheet` (phone); the List is one component with forms `column`, `panel` (See all), `float` (Map wide) and `sheet` (phone). The fit rule, the summaries and the counts are in the component, not in the form.

**L-20. Breakpoints are named tokens** in `ui/src/styles/layout.css` (new) and `ui/src/lib/layout.ts` (the same numbers for the ResizeObserver code): `P <= 700 < T <= 1279 < L <= 1599 < D <= 2239 < W <= 3199 < U`, short `<= 820` tall, tall `>= 900`, tall-plus `>= 1200`, tall-max `>= 1300`. No other media query width appears in the game screen's CSS.

## 3. Breakpoints and the grid

Root size per L-3; region widths in rem so they scale with it.

| Class | Width | Example sizes | Main grid (desk) | Thing layout (L-7) |
|---|---|---|---|---|
| P | up to 700 | 390 x 844 | phone tree (L-15) | one column |
| T | 701 to 1279 | 1024 x 768 | Thing (full width) / Plan bar under it | 2 answer columns (short) |
| L | 1280 to 1599 | 1366 x 768, 1440 x 900 | Thing `1fr` / Plan `26rem` | 2 columns (1440 x 900), 2 answer columns (1366 x 768, short) |
| D | 1600 to 2239 | 1920 x 1080 | List `20rem` / Thing `1fr` / Plan `25rem` | 2 columns |
| W | 2240 to 3199 | 2560 x 1440 | List `21rem` / Thing `1fr` / Plan `27rem` | 3 columns |
| U | 3200 and up | **3440 x 1440**, 3840 x 2160 | List `22rem` / Thing `1fr` / Plan `28rem` | 3 columns |

Rows: State (auto, two lines; one line at U) / Bar (auto) / main (`minmax(0, 1fr)`) / Plan bar (auto, T only). The app is exactly `100vh` and `overflow: hidden` at every class except P.

Gutters: regions are separated by a 1 px line, no gap; inside regions `--pad: 1.25rem` (1.5rem at U) and `--gap: 1rem` (1.25rem at U).

## 4. Region map per size

Measured in the mocks (px at that size; widths include padding).

| Size (root) | State | Bar | List | Thing | Plan | Map mode |
|---|---|---|---|---|---|---|
| 390 x 844 (16) | sticky top, 1 line + "State ▾" | in the sticky top (Back, n of m, See all) | "See all" sheet | the page, one thing | review screen; Next in the sticky bottom | map band 34vh, card below, Execute in the sticky bottom |
| 1024 x 768 (16) | 2 lines, short labels (flag, "Month 4 of 12", "Mission · 2 of 3 goals on track") | sentence + Back, Next, See all 6, Check and execute | See all panel | 1024 wide, text header, answers 2 x 2 | bar: Review 5 recommended, consequence line, Execute | card left (compact), strip at the bottom |
| 1366 x 768 (16) | 2 lines | + Show switch | See all panel | 950 wide, scene 8.5rem, answers 2 x 2 | rail 416: Decided and Recommended folded with summaries, Accept all, Execute | card left, strip |
| 1440 x 900 (16) | 2 lines | + Show switch | See all panel | 1024 wide, 2 columns: scene + goals / answers | rail 416 (Decided and Recommended folded at 5 recommended; open with fewer) | card left, strip |
| 1920 x 1080 (16) | 2 lines, full labels | sentence + Show, Back, Next, Check and execute | column 320: 6 rows | 1200 wide, 2 columns: scene 16:9 + goals + how it got here / 4 answer cards filling the height | rail 400, all open | card 500 left, Plan float 400 right, map between |
| 2560 x 1440 (17.5) | 2 lines | as 1920 | column 368 + Your mission | 1730 wide, 3 columns | rail 472 | + List under the card |
| **3440 x 1440 (17.5)** | **1 line** | as 1920 | column 385 + Your mission | **2560 wide, 3 columns: scene + how it got here / answers with detail lines + what your advisers say / subject map + your goals in this call + background** | rail 490, all open, Execute at the bottom | card 560 + List under it on the left, map in the middle, Plan float 490 right |
| 3840 x 2160 (20.6) | 1 line | as 1920 | column 453 + Your mission | 2810 wide, 3 columns | rail 577 | as 3440 |

### Desk, month 4 (agenda: 6 things)
State band; Bar ("2 of 6: Xi Jinping calls / 1 done, 5 to go", Show: One at a time | Everything, Back, Next: Takaichi visits, See all 6 (T and L only), Check and execute); List (D and up: "This month: 6 things", each thing a full-width row button with its state in words, "You are here" outlined in amber, Your mission at the foot from 1200 tall); Thing (L-7); Plan (L-9, L-10).

### Desk, month 1 (simple desk: 2 things)
Same regions and places (a newcomer meets the layout they will keep). Differences: no Show switch; State hides the meetings and defense budget items ("from month 2"); the List shows the 2 things and the flat line "Your ministers take this month's 3 meetings (no effect). From month 2 you choose."; the Thing's situation column starts with "Your goal" and the intro sentence (L-8 step 4 on short screens); the context column (W and U) holds the subject map, "Your 3 goals" and "How a month works" with Read the briefing.

### Everything view (expert, design-agenda 0.7)
At D and up the List is always shown, so "Everything" only turns auto-advance off and keeps the Thing on what the player opened. At L, Everything adds the List column (`20rem`) and the Thing drops one layout step (the 1366 x 768 Thing becomes 734 wide: answers 2 x 2). At T and P Everything is not offered (as designed in round 2).

### Review page ("Check what will happen")
Replaces the Thing and the Plan with one page in the main area (the List stays at D and up, the State and Bar stay): at L and up two columns, left "You chose / You accepted / You skipped" rows with Change or Undo, right "If you execute now" in 17 px bullets and Execute; at T one column with Execute at the foot, all in view (rows compact like L-10 step 2; with more than 8 rows the groups fold to summaries with Show); at P its own screen (the only Execute on the phone desk).

### After Execute: result card, details, paper
- **Result card** (`scenes/ResultCard.tsx`): a full-screen stage under the State band (the band updates to the new month's numbers, so the player sees the change). L and up: scene left (55 %), the result text right (max 38rem), the buttons "Details" and "Next: the paper" bottom right, in view. W and U: the details (`OutcomeCard`s) open beside the result as a grid of `repeat(auto-fill, minmax(26rem, 1fr))` columns instead of pages; at D and below they stay pages with "Page 1 of 3" and Back/Next buttons (a page, never a scroll box).
- **Paper** (`Chronicle.tsx`): a newspaper page sized to the viewport with CSS columns (`column-width: 22rem`, so 2 columns at 1366, 4 at 1920, 6 at 3440), "Continue to month 5" fixed bottom right in view; what does not fit goes on page 2 with "Page 1 of 2 ›" (a visible count). Phone: one column, page scroll, the Continue button in a sticky bottom bar with "2 more stories below ↓".

### The reveal
Each of the 8 stages (`reveal/model.ts`) is a full-viewport slide with the stage rail always in view; no stage scrolls at 1024 x 768 and up. Content grids grow by columns: achievements `repeat(auto-fill, minmax(16rem, 1fr))`, the reality table and run comparison side by side from D; text blocks max 38rem. A stage whose content exceeds the viewport splits into two slides (the rail shows both), never a scroll box. Phones: one stage per screen with the page scroll and a "Next stage ›" sticky bottom.

## 5. The state band

| Field | Words (glossary) | P | T | L | D | W, U |
|---|---|---|---|---|---|---|
| Who | "President of the United States" | no | flag only | "United States" | full | full |
| Month | "Month 4 of 12 · April 2027" | "Month 4" | "Month 4 of 12" | full | full | full |
| Mission | one button: "Mission: <name> · 2 of 3 goals on track · Open ›" (D6) | in State ▾ | "Mission · 2 of 3 goals on track Open ›" | full | full | full |
| Political capital | "Political capital (what orders cost) ◆ 3 of 6" + Explain | "◆ 3 of 6" | without "(what orders cost)" | same as T | full | full |
| Orders | "Orders 0 of 6" | yes | yes | yes | yes | yes |
| Meetings | "Meetings you take 0 of 3" (month 2 on) | in State ▾ | "Meetings 0 of 3" | full | full | full |
| Defense budget | "Defense budget 12% used" (month 2 on) | in State ▾ | "Defense 12% used" | same as T | full | full |
| Your country | Approval, Stability, World tension | in State ▾ | "Tension" | yes | with the label "Your country" | yes |
| Switches | Desk / Map | in the thing line (Desk) | yes | yes | yes | yes |

Layout: line 1 who, month, mission | Desk/Map at the right; line 2 "This month" group | divider | "Your country" group. At U the two lines join into one (who, month, mission | this month, your country | switches). Values are plain text (AF-14 spirit: not buttons); Explain and Mission are the only controls. When a value changes (an order queued), it updates in place with a 300 ms highlight, so the cost is seen where the budget is.

## 6. Recommended, Accept all, Execute and the month's things together

- The month's things are named three times, always the same words and order: the Bar sentence ("2 of 6: Xi Jinping calls"), the List (or See all) and, for the recommended ones, the Plan's Recommended rows (each with "Open ›", which goes to that thing).
- At L and up the Plan holds, top to bottom: Decided, Recommended with Accept all directly under its rows, Skipped, then the Execute block pinned at the bottom (L-9). The fit rule (L-10) keeps the Recommended count, Accept all and Execute in view at every size; at 1366 x 768 with 5 recommended the mocks show Decided and Recommended folded to summaries, Accept all (5) and its definition, and the full Execute block.
- At T (and Map under 1600) the Plan is the bar: "☰ Review 5 recommended" opens the Recommended list with Accept all inside it (so nothing is accepted unseen, D-72 D4), the consequence line, Execute.
- No part of this ever scrolls; the QA3-S3-3 rules in `staff-picks.css` (`.sp-list { overflow-y: auto; max-height }`, the `:has(.staff-picks.v-rail)` grid rows) are deleted, not patched.

## 7. What may scroll, and how it is signalled

Allowed scroll regions (each `data-scroll="reading"`, the audit exempts only these):
1. A codex article in the Codex drawer.
2. The situation briefing's long text (`SituationBriefing`, `BriefingPanel`).
3. The run history list (`reveal/RunHistory`) and a country dossier's relation list (40 rows) in the map dossier.
4. On phones only: the page (L-15) and the paper.

Signal (all of them): a visible scrollbar (no overlay-hidden scrollbars, `scrollbar-gutter: stable`), a 32 px fade at the bottom edge while more is below, and a length cue at the top ("Codex: Strait of Hormuz · 4 min read") or bottom ("3 more paragraphs ↓", a button that scrolls). A reading region never contains a control the month needs (no Choose, Accept, Execute, Next inside it); its own links and Close stay outside the scrolling part.

Not allowed to scroll (they fold or paginate instead): the order catalogue (All orders, 28 orders) is grouped by family tabs with counts ("Diplomacy 6 · Military 8 · ..."), each tab's orders fit in view as a grid of `repeat(auto-fill, minmax(18rem, 1fr))`; the paper and the result details paginate; the reveal splits stages.

## 8. What changes from iteration 3

| Iteration 3 | Iteration 4 |
|---|---|
| HUD + GoalLine, political capital and budgets in the rail body | One state band (L-5, section 5); budgets leave the rail |
| `.focus-view` / `.detail` `max-width: 1180px; margin: 0 auto` | No centred max-width; regions and Thing columns (L-2, L-7) |
| `.desk-stage { overflow-y: auto }` | No scroll; short-screen compaction (L-8), fill on tall screens (L-12) |
| Rail 360 px fixed; `.rail-body` and `.sp-list` scroll (QA3-S3-3) | Plan `25 to 28rem`, fit rule with folded summaries (L-10); bar form below 1280 (L-11) |
| Navigator 264 px only in Full desk | List column at D and up in both views; See all panel below |
| 16 px on every screen | Root size by the short side (L-3) |
| Map: strip with Approve, a map card of fixed size | Map: Plan float from 1600 with the desk's Execute place, card compacts, List under the card on wide screens (L-14) |
| Phone: CSS squeeze of the laptop layout, plan bar | Phone tree, sticky state and thing line, below-the-fold cue (L-15) |
| Breakpoints 600 / 899 / 1279 / 1200 / 760 scattered | Named tokens P, T, L, D, W, U, short, tall (L-20) |

## 9. Acceptance criteria (the layout audit guard checks these)

The guard runs the month in the real app (Hormuz Convoy USA, fixed seed, month 1 and month 4 with at least 5 recommended) in Desk and Map mode at 390 x 844, 1024 x 768, 1366 x 768, 1440 x 900, 1920 x 1080, 2560 x 1440, 3440 x 1440 and 3840 x 2160, using `devloop/kit/layout-audit.mjs` (config in section 10) plus the World Conflict extras.

- **AC-L1 No inner scroll.** At 1024 x 768 and larger, no visible element outside `[data-scroll="reading"]` has `overflow-y|x: auto|scroll` with `scrollHeight > clientHeight + 1` (or the width equivalent); `document.documentElement.scrollHeight <= innerHeight` (no page scroll). Kit checks `inner-scroll`, `page-scroll`.
- **AC-L2 State always visible.** The state band (`[data-region="state"]`) is visible, inside the viewport, not covered, at every size and during the whole month (including with the See all panel, Review and the result card open), and its text contains the month ("Month n"), political capital ("◆ n of 6") and "Orders n of 6".
- **AC-L3 Uses the width.** At 1920 wide and up, horizontal coverage of the main area is at least 0.85. Exact metric: mark every viewport pixel column x (0 to W-1) covered by at least one visible content box inside the main area (below the state band): the client rects of every non-empty text node, and the boxes of every button, img, svg (except the world map), canvas, input and select; coverage = covered columns / W. In Map mode the world map counts as content (it fills the area); the panels' own coverage is reported as `panelCoverage`. The kit's `used-width` (union of the content regions' extents, min 0.85) is checked as well. Mocks: desk 0.93 to 0.95, kit 1.00.
- **AC-L4 Nothing interactive out of view.** At 1024 x 768 and up, every visible control (`button, a[href], [role=button|tab], input, select, summary`) is fully inside the viewport and not covered (elementFromPoint at its centre and two inner corners returns it or a descendant); no region clips content with `overflow: hidden` (scrollHeight > clientHeight + 2 on a region). Kit `below-fold` (max 0) and `occluded` (max 0).
- **AC-L5 Phones collapse visibly.** At 390 x 844, when any answer card is below the fold or under the sticky bottom bar, the cue is visible and its text names the count ("2 more answers and Skip below ↓"); no inner scroll region on phones; the List and the state details are reachable from visible buttons (See all, State ▾). Kit `collapsed-not-hidden` at 390 and 1024 (List region: expanded or a visible summary).
- **AC-L6 The month's must-act controls in view.** At 1024 x 768 and up: every answer card including Skip, Accept all recommended (n) or "☰ Review n recommended", and Execute are inside the viewport and not covered.
- **AC-L7 Text floor.** No visible text under 15 px at any size (AC-22).
- **AC-L8 No truncation.** No button text cut (scrollWidth > clientWidth with overflow not visible).
- **AC-L9 One Execute.** Exactly one visible "Execute month n" button (phone desk: zero until the review screen).
- **AC-L10 Fill.** At 1600 wide and 900 tall and up, in each of List, Thing and Plan the lowest visible content reaches at least 85 % of the region's height (mocks: 0.96 to 0.98).
- **AC-L11 No overlap, no spill.** No two visible controls overlap by more than 2 x 2 px (phone sticky bars excepted, what is under them counts as below the fold); no control's content is taller than its box.
- **AC-L12 Fit rule.** With 7 recommended at 1366 x 768 and 1440 x 900, the Recommended heading with "(7)", Accept all recommended (7) and Execute are in view; every folded section shows its count, summary and a Show button; pressing Show opens it with no scroll (the others fold).
- **AC-L13 Breakpoint forms.** At each size the regions take the form in section 4 (List: column at 1920 and up, See all below; Plan: rail at 1280 and up on the desk, bar below 1280; Map Plan float at 1600 and up, strip below; Thing columns per L-7), checked by `data-form` attributes on the List and Plan components.
- **AC-L14 Root size.** `html` font size is 16 px at 1920 x 1080, 17.5 px (plus or minus 0.2) at 3440 x 1440 and 2560 x 1440, 20.6 px (plus or minus 0.3) at 3840 x 2160.

## 10. The guard

- Kit: `devloop/kit/layout-audit.mjs` (generic, branch `build-layout-audit`) measures AC-L1, L3, L4, L5 and the region states. Product config: `layout-audit-mocks.json` here is the mocks' config; the build's guard uses the same regions on the real selectors: `state` = `[data-region="state"]`, `item` = `[data-region="item"]`, `plan` = `[data-region="plan"]` (rail, float, bar or phone bottom), `list` = `[data-region="list"]` with summary `.month-bar .see-all, .ph-thingline`; exempt `[data-scroll="reading"]`; rules as in that file with `no-page-scroll` and `no-hidden-items` from 1024 x 768.
- World Conflict extras (AC-L2, L6 to L14) as a registry guard `RS-008-1.mjs` under `scenarios-qa/regressions/`, reusing the measuring code of `layout-shots.mjs` (`audit()` and `verdict()`), driven through the month with `kit.mjs deviceFor('<w>x<h>')`.
- Registry entry `RS-008-1` in `regressions.yaml`; the panel adds a large-monitor persona at 3440 x 1440 (D-80).

## 11. Work packages: changes for the agenda build

- **WP-L0 (new, first): layout frame.** `ui/src/styles/layout.css` (tokens L-20, root size L-3, the app grid, region classes, breakpoint forms); `ui/src/lib/layout.ts` (same breakpoints, `useLayoutClass()`, the fit rule as `useFitPlan(ref)`); `Desk.tsx` becomes the five-region grid (`data-region` on each region, `data-form` on List and Plan); delete `.focus-view`/`.detail` max-width, `.desk-stage` overflow, the QA3-S3-3 block and `.sp-list` scrolling in `staff-picks.css`.
- **WP-L1 (new): state band.** New `components/StateBand.tsx` replacing `Hud.tsx` and `desk/GoalLine.tsx` (mission button, Explain, Desk/Map, short labels per section 5, State ▾ sheet on phones); `CommandRail` loses `Budgets`.
- **WP-A2 changes:** `desk/MonthBar.tsx` carries the Show switch (moved from the goal line) and the month 1 sentence; `desk/AgendaList.tsx` forms `column | panel | float | sheet` (L-19), rows `flex: none`, "Your mission" foot; the Thing (`YourMove.tsx`) gets the container-query layouts of L-7, the 16:9 scene and "How it got here" (from the chronicle: the last 3 months' entries about this subject, `lib/agenda.ts` `storyFor(item)`), "What your advisers say" (from `advice`, already in the payload), the context column (`scenes/ContextMap.tsx`, goals in this call from `missionImpact`, codex background via `lib/codexMatch.ts`); option cards gain the detail line (`more`: cost and who reacts, from the preview); `desk/PhoneMonth.tsx` with the sticky cue (L-15).
- **WP-A3 changes:** the Plan component with forms `rail | float | bar | sheet`, the fit rule (L-10) with folded summaries and Show; Execute block pinned; no budgets.
- **WP-A4 changes:** Map card sizes and compaction (L-14), Plan float from 1600, strip below, List under the card at W and U, map camera padding by the panels' widths (`MapView.tsx`).
- **WP-A5 additions:** AF rules unchanged; add L-18 (no overlap, rows never shrink) to the affordance audit.
- **WP-A6 additions:** guard `RS-008-1`, kit config, visual baselines at 1366 x 768, 1920 x 1080 and 3440 x 1440 (desk month 1, desk month 4, Map), docs (`docs/ARCHITECTURE.md` frontend: layout regions and forms; CLAUDE.md frontend paragraph).
- **Result, paper, reveal (new WP-L2):** section 4 "After Execute" and "The reveal" (result details as a grid at W and U, paper columns and pages, reveal stages split instead of scrolling); visual baselines for the result card and the paper at 1920 x 1080 and 3440 x 1440.

Order: WP-L0 and WP-L1 before A2/A3 (they set the frame those packages fill); WP-L2 after A4. WP-L0 alone already fixes the CEO's two complaints (empty sides and the scrolling rail) with the current content.

## 12. Art Director review (hierarchy, density, quality at 1920+ and 3440)

Reviewed on the mock screenshots at 1920 x 1080, 2560 x 1440, 3440 x 1440 and 3840 x 2160.

- **Hierarchy.** One reading order at every size, left to right: what this month holds (List), what is asked now (Thing), what will happen (Plan). The current thing is the visual centre of weight (the scene picture, the 30 px title, the amber "You are here" row); the amber primary appears once (Execute, bottom right) so the eye ends there. Verdict: holds at all sizes. Condition: the scene art must be framed for 16:9 (the mock's art is cropped; `scenes/art/STYLE.md` gets a 16:9 framing note, and every scene is checked at 3440 x 1440 in the design review).
- **Density.** At 3440 x 1440 the screen is full (coverage 0.95, fill 0.97 to 0.98) with real game content, not padding: the story so far, the advisers' voices, the subject map, goals at stake and background, all of which the game already has. Text stays at a comfortable line length (L-4), so a big screen reads like a broadsheet, not a stretched laptop. Condition: the timeline in "How it got here" must not spread 4 short entries over 900 px with nothing between (3440 mock: about 170 px between entries); the build gives each entry its date, a one-line headline and the effect it had on you ("China -4"), and caps the gap at 3rem, putting the extra height into the scene picture instead.
- **Quality at 1920.** The densest desktop. The List rows wrap to 3 lines at 20rem. Abbreviating the state words ("Rec.") is not allowed (glossary); instead, at D the row shows only the state word on line 2 ("To do", "Decided: joint patrol") and leaves the recommendation detail to the Plan's Recommended rows; W and U keep the full line. Answer cards at 1080 tall stretch with centred content and no detail line: acceptable; with the detail line from 1200 tall they read better.
- **Map at 3440.** The map is the hero: card and List on the left, Plan on the right, the subject centred in the gap between them. Condition: panels use the same surface, border and 16 px radius as the desk regions so the two modes read as one product; the map gets a subtle vignette under the panels so their edges stay crisp over bright land.
- **What would make it feel stretched (must not happen):** a single card wider than 60rem, a paragraph wider than 38rem, a picture upscaled beyond its art resolution (scenes are SVG, so fine), empty column bottoms. The fill rule and AC-L10 guard the last one.
- **Sign-off:** approved for build with the four conditions above (16:9 framing, timeline content and gap cap, 1920 List row text, map panel surfaces and vignette).

## 13. Game Designer review (where decisions sit; deciding, not accepting)

- **The player always sees what to decide.** The Bar names the current thing and how many remain, the List (or See all with its count) names every thing with its state ("To do", "You are here", "Decided: ..."), and the Thing shows the full question with every answer at once: on every screen from 1024 x 768 the Skip card is in view (AC-L6), so "decide or skip" is always a visible, complete choice. Nothing to decide hides below a fold, which was the iteration-3 failure (24 controls below the fold in month 2).
- **Deciding is the natural path.** The answers are the largest, most central element, each with its effects on the goals in words; on wide screens the goals at stake, the advisers' disagreement and the story so far sit next to the answers, so the player has the reasons to choose in the same glance. Accept all recommended is one outlined, secondary button in the Plan, under the list of what it accepts, with its definition line; it is never the amber button and never next to the answers. At 1366 x 768 the fit rule folds the Recommended rows to a summary before it would fold anything in the Thing: the decision content wins space over the shortcut.
- **Advisers disagree on screen.** "What your advisers say" (tall screens) shows three voices with different recommendations, and the recommended card names who recommends it and why; this keeps "Recommended" a view, not the answer, and supports WP4-8 ("Accept all is not the winning strategy").
- **Consequences before commitment.** "If you execute now" is always in view next to Execute (rail, bar, Map float, phone review), with the costs of untouched things named ("China -3, Japan -2"), so executing early is a visible trade, not a surprise.
- **Count of real decisions.** The layout does not add or remove decisions; month 4 stays 6 things (design-agenda 0.2). The play pass (D-81) counts decisions made by choosing vs by Accept all at 3440 x 1440 and at 1366 x 768 on the control seeds; target: the layout does not raise the Accept all share on the small screen (where Recommended is folded) or the large one.
- **Sign-off:** approved; the play pass measure above is added to the iteration-4 play pass.

## 14. Design-review checklist (UX Designer and Art Director, before merge, D-81)

Run on the built branch in the real app, Hormuz Convoy USA fixed seed, after `npm run dev`:

1. **Audit first:** `RS-008-1` and the kit layout audit pass at all 8 sizes, Desk and Map, months 1 and 4 (attach the table).
2. **Screenshots to take** (`kit.mjs deviceFor('<w>x<h>')`, saved under `runs/iter-04/design-review/`): at 3440 x 1440, 1920 x 1080, 1366 x 768, 1024 x 768 and 390 x 844: desk month 1; desk month 4 on a call (the Xi call or the seed's equivalent) with at least 5 recommended; desk month 4 with the See all panel open (1366 and 1024); the Plan with a folded section opened by Show (1366); Review page ("Check what will happen"); Map mode month 4; the result card; the paper; reveal stages 1, 4 and 8; codex drawer open on a long article (the reading scroll and its signal). At 2560 x 1440, 1440 x 900 and 3840 x 2160: desk month 4 and Map only.
3. **Per screenshot, check:** (a) the five regions in the form section 4 names for that size; (b) the state band complete for that size (section 5) and unchanged in place across screens; (c) no empty band wider than one gutter on any side, no column bottom empty by more than 15 %; (d) no text line longer than about 70 characters; (e) one amber button, Execute, bottom right (phone: bottom); (f) every answer and the Skip card visible; Accept all with its count and definition visible or behind "Review n recommended"; (g) nothing clipped, overlapping, truncated or under 15 px; (h) the scene art framed (no face or flag cut), 16:9 on tall screens; (i) the words match the glossary (Recommended, Choose, Accept all recommended, Skip).
4. **Interactions to try at 1366 x 768 and 3440 x 1440:** choose an answer (auto-advance, the Plan updates, no jump of the layout), Skip and Undo, Show on a folded Plan section, See all and open a thing, queue an order (the state band updates in place with the highlight), switch to Map and back (regions keep their places), resize the window from 1366 to 3440 (no scrollbar appears at any width; the forms switch at the named breakpoints only).
5. **Phone at 390 x 844:** scroll through a thing (the cue counts down, the sticky top and bottom never cover a control that is the only way to act), open State ▾ and See all, reach the review screen and Execute.
6. **Record:** `design-review` with the controller (`loop.mjs record design-review`) with pass or the list of items, each with its screenshot and the rule (L-n) or criterion (AC-L n) it breaks; S2 for any AC-L failure or a region missing, S3 for visual quality items.

## 15. Risks and open points

- **Scene art at 16:9 and tall framings** (Art Director condition): the 20 scenes were drawn for a wide band; WP-A2 must check each at 3440 x 1440 and 1366 x 768; a scene that does not frame falls back to the band height with "How it got here" taking the rest.
- **Content for the wide columns** ("How it got here", advisers, context) comes from data the game has (chronicle, `advice`, `missionImpact`, codex), but needs UI selectors; if one is empty for a thing, the column shows the remaining blocks larger (fill rule), never an empty box.
- **Very long months** (10 things before grouping, 7 recommended): the List at D with 10 rows needs about 640 px; at 1920 x 1080 it fits (920 px available); at L it is the See all panel. AC-L12 tests 7 recommended.
- **1280 x 720 and zoomed laptops** (1440 x 900 at 125 % = 1152 x 720): handled as T/short (bar Plan, text header). Below 1024 x 700 the laptop tree may show the phone tree; not a target size.
- **Browser support:** container queries and `:has()` are used (Chrome 105+, Safari 16+, Firefox 121+); the build already uses `:has()`.

## Changelog

- 2026-11-23: first version (D-80, RS-008; D-81 reviews and checklist; 3440 x 1440 primary): rules L-1 to L-20, breakpoints P/T/L/D/W/U, region map per size, state band, fit rule (supersedes QA3-S3-3), scroll policy, result/paper/reveal layout, AC-L1 to AC-L14, guard, work packages WP-L0 to WP-L2 and changes to WP-A2 to A6; mocks `layout-desk-m1`, `layout-desk-m4`, `layout-map` at 8 sizes, self-check 24 of 24, kit layout audit 0 violations.
