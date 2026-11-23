# Design review: build-order-cards (D-81)

Reviewer: UX Designer and Art Director. Branch `build-order-cards` at 6c18b63 (full verify passed), package RS-007 (order cards: 28 pictograms, family colours, lighter paper, one OrderCard, danger confirmation on 11 orders, order log, contrast guards). Compared with the shared branch `dev/rc1-synthetic-loop` (583ac40, the merge base) through the stability review's evidence (`design-review-stability/re-*` and `re-audit-*.txt`, same seat and states) and the shared branch's Windows visual baselines (extracted read-only with `git show`, saved here as `baseline-before-*` / `baseline-after-*`).
Seat: Ceasefire or Collapse, Ukraine, seed code CO-UKR-MAYA1, pinned through the RS-008 seat route (`_lib.mjs` `startGame` / `pinSeat`). Branch served by the running dev servers (UI 5173, API 8080).
Sizes: 3440x1440 (CEO, first), 2560x1440, 1920x1080, 1440x900, 1366x768 (one desktop session resized), 1024x768 (tablet session), 390x844 (phone session). States: orders gallery `#orders`; month 1 as it opens; month 1 Full desk with All orders (no target, then target Russia); a danger order's confirmation (Strike military targets in Russia); orders added (Mobilize forces, Reform program) with unaffordable and invalid cards; search rows; month 2 Desk (staff-proposed orders) and month 2 Full desk; Map mode with Russia's order menu, and the danger confirmation inside it.
Method: `devloop/kit/layout-audit.mjs` with `layout-audit.config.mjs` (`game` config) at every state and size, a card-facts probe (controls under 44 px, overflowing text, card sizes), and screenshots read side by side. Scripts: `design-review-order-cards/_scripts/` (`capture.mjs`, `gallery.mjs`).

## Verdict: CHANGES REQUIRED

The cards are a real step up: they read as crafted game objects now, not dashboard tiles. The pictograms are consistent, the family plates and chips are legible, the state visuals follow the spec, and nothing in the main desk layout got worse. One item blocks the merge. The new danger confirmation breaks on the compact tiles of the Map order menu, which is where a player gives most targeted orders in Map mode. Two S3 items need fixing alongside it.

## Required changes

1. **S2, danger confirmation on compact tiles (Map order menu) is cut, cramped and partly hidden.** `ui/src/components/orders/ConfirmFace.tsx` (new `.ord-confirm-head`) and `ui/src/styles/orders.css` (`.ord-confirm-head`, `.ord-confirm-title`, and the face inside `.ord-tile.ord-compact` / the map menu grid). On a 170 px compact tile the face now stacks: plate, family chip, the order title, then the same title again as the question, the "risky order" line, three consequences and the buttons. Results, measured on the screenshots:
   - 3440x1440 (CEO): the "Cancel" label runs past its button edge (the last letter is clipped), "Give the order" breaks onto three lines, and the order title is shown twice in full. The face stretches its row, so the neighbouring card (Propose ceasefire) becomes a tall empty box, and the fifth tile (Destabilize) drops under the command strip.
   - 1024x768 (tablet): the face's buttons are below the menu's visible area. The player has to scroll inside the menu to find Cancel or Give the order. That breaks the layout rule "nothing the player must act on hides in an inner scroll".
   - 390x844 (phone sheet, rows): fine. Full-width face, 44 px buttons, focus on Cancel.
   Before this branch only war, nuclear and mission warnings showed a face, and none of them appears in this menu for this seat. Now 9 more orders can, including Mass troops facing and Strike military targets, which the menu offers in every war month.
   Fix: (a) In the face, show the order title once. Put the plate and family chip on the question's line ("[plate] MILITARY · Strike military targets in Russia?") and drop `.ord-confirm-title` when it matches the question. (b) In the map menu, let a confirming tile span both columns (`.ord-menu .ord-wrap.is-confirming { grid-column: 1 / -1 }`), so the buttons get their natural width and labels do not wrap (`white-space: nowrap` and `min-width: 44px` on the face buttons). (c) When the face opens, scroll its button row into view inside the menu (`scrollIntoView({ block: 'nearest' })` on the safe button after focus). Then check at 3440x1440, 1366x768 and 1024x768 that Cancel and Give the order are whole and on screen without scrolling. Add a guard: open a danger face from the map menu on CO-UKR-MAYA1 month 2 and assert both buttons are fully inside the menu's visible box (no clipping) at 1366x768 and 1024x768.
   Evidence: `design-review-order-cards/zoom-map-confirm-3440.jpg`, `month-2-map-confirm-3440x1440-CEO.jpg`, `month-2-map-confirm-1024x768.jpg`, `month-2-map-confirm-390x844.jpg` (good reference).

2. **S3, one vocabulary: the catalogue group headings contradict the new family words.** `ui/src/components/orders/OrderCatalog.tsx` (groups by `def.category`) against `ui/src/lib/glossary.ts` `ORDER_FAMILY_WORDS` and `ui/src/lib/orders.ts`. The branch adds family chips (DIPLOMACY, MILITARY, NUCLEAR, COVERT, ECONOMY, HOME) to every card, but the All orders groups still come from the old categories: "Intelligence" above COVERT cards, "Domestic" above HOME and ECONOMY cards, Declare war (MILITARY chip) under "Diplomacy", and Fund nuclear program and Nuclear strike (NUCLEAR chips) under "Military". The player now sees two names for one concept on one screen, and the order sits under one family name while its chip says another.
   Fix: group the catalogue by `def.family`, in the `FAMILIES` order, with headings from `FAMILY_WORD`, so heading and chip always match. Retire `OrderCategory` from the UI, or keep it only for the engine's report. Add "Intelligence" and "Domestic" as banned synonyms for the family words in the glossary test where they would name an order family.
   Evidence: `m1-catalog-russia-3440x1440-CEO.jpg` (Declare war under Diplomacy), `m1-confirm-danger-1920x1080.jpg` (Nuclear cards under Military, "Intelligence" heading below).

3. **S3, density: the catalogue tile is about 26% taller and the phone still shows full tiles; the design asked for rows there.** `ui/src/styles/orders.css` `.ord-tile > .wc-card { --card-art-h: 104px }` plus the plate row (`.wc-card-lead`). Same card, same gallery: the Spy on India tile grows from about 262 px to about 330 px at 1440 and at 390 (`baseline-before-gallery-orders-390.jpg` vs `baseline-after-gallery-orders-390.jpg`). On the phone the All orders list is one 300 to 330 px tile per row, about 1.5 cards per screen. The audit measures 8,224 px hidden in the catalogue scroller with no target and 9,099 px with Russia (28 tiles). At 1366x768 four tiles are on screen. `design-order-cards.md` section 5 says the phone catalogue switches to rows (the 76 px `OrderCard` row the dossier and search hits already use).
   Fix: under 600 px render the catalogue groups as `variant="row"` cards. Keep the full tile from 600 px up, where the taller band pays for itself. Target: at least 6 orders visible per phone screen. Check that no title is cut off and that no horizontal scroll appears at 390.
   Evidence: `m1-orders-added-390x844.jpg`, `m1-catalog-russia-390x844.jpg`, `audit-phone.txt` (`m1-catalog-*` rows).

## Small items (S3/S4, can follow)

- **Month 2 Desk is slightly worse than before (RS-008 class).** The order rows gained a family-chip line, about 20 px each. Hidden content in the stage scroller grows by 50 to 76 px: 3440 is 1,638 px hidden against 1,570 before, with 26 controls below the fold against 25 (the Propose ceasefire row is the new one); 1366 is 2,672 against 2,604; 1024 is 2,931 against 2,855; 390 is 2,072 against 1,996. Fold the chip into the meta line ("◆ DIPLOMACY · Proposed by staff ...") so the row keeps its old height. `audit-desktop.txt` vs `design-review-stability/re-audit-branch-desktop.txt`. S3.
- **Danger and war faces look the same.** The reversible danger face uses the full war red (red plate, red border, red primary). Only the NO UNDO chip and one sentence tell them apart. Keep red for NO UNDO and give "danger" a quieter treatment, for example a dark face, a red edge only, and a neutral "Give the order" button. Then the war face still feels like a big moment. `zoom-desk-confirm-1920.jpg` vs `gallery-confirm-1440x900.jpg`. S3.
- **ORDERED stamp covers the cost seal** on a queued tile. The stamp now sits at the band's top right, over the seal (spec 9.3: "nothing covers the cost seals"). The "1 held" chip repeats the cost, so this is cosmetic. Move the stamp left of the seal column. `zoom-queued-unaffordable-3440.jpg`. S4.
- **SITES tag is not legible** on the Strike nuclear sites plate, even at 52 px. The radiation sign in brackets carries the meaning and the title is always there, so this is acceptable. Either enlarge the tag letters or drop the tag for a cleaner icon. `zoom-pictograms-sites.jpg`. S4.
- **"free" appears twice** on dossier and map-sheet rows: a seal badge on the plate plus a "free" meta line. `gallery-dossier-1440x900.jpg`. S4.
- **Fix-button label wraps** mid-token: "Remove a staff order (frees ◆ / 1)" at 1440 in the gallery. Keep "◆ 1" together (`white-space: nowrap` on the cost token). `baseline-after-gallery-orders-1440.jpg`. S4.
- **Pre-existing, not caused by this branch, noted for the backlog:** the secondary card links ("How much? Forecast" 130x32, "Remove" 85x36, the "Pick a country" and alternative buttons, 36 px high) are under 44 px on the phone. Their classes are unchanged by this diff (`facts-phone.txt`, `facts-gallery-phone.txt`). The staff-proposed row still says "Proposed by staff (Foreign Minister)" (`TERMS.proposed`), while the rail and D-72 say "Recommended by Foreign Minister". The two "Remove" links on proposed rows are covered by the card's hit area at 3440 and 2560, the same as shared.
- **Audit note, invalid tiles:** at 1920 and up the audit reports the invalid cards' hit area as covered by their reason text (Court Russia, Break pact with Russia). An invalid tile's press only repeats the reason, so this is harmless. S4.
- **Unrelated baseline in the branch:** commit 6c18b63 also rewrites `win32/reveal-0-1440.png`. The old Windows file showed stage 1 (the verdict) under the stage-0 name, and the new one correctly shows stage 0 (the count). This is a correction, but it is not an order-card change. Say so in the commit message, or move it to its own commit. `baseline-before-reveal-0-1440.jpg`, `baseline-after-reveal-0-1440.jpg`.

## Per change

| Change | Judgement |
|---|---|
| 28 pictograms ported (plus reserve) | Good. One grid, one weight, all dark on their plates, all crisp at 52, 42 and 34 px. They read as one family, and the matched pairs work (mobilize / stand down, mass / withdraw troops, spy / hunt spies). SITES tag illegible (S4). `gallery-pictograms-1440x900.jpg` |
| Six families with words, new tokens | Good on screen. Blue, vermilion, striped yellow, orchid, teal and ivory are told apart easily. Every card has the plate, chip word and edge, so colour is never the only cue. Chip text reads well on every chip. Contrast numbers taken from the branch's guard test, not re-measured. Vocabulary clash with the group headings (required 2) |
| Lighter paper, 104 px full-colour band, plate overlapping the band | The biggest gain: the catalogue now looks lit and illustrated, close to the crisis cards. Costs height (required 3 on phone, S3 on month 2 rows). `baseline-before-gallery-orders-1440.jpg` vs `baseline-after-gallery-orders-1440.jpg` |
| One OrderCard on desk, search, staff rows, map menu, dossier | Same plate, chip and edge on every surface seen. Compact map tiles use the family band with a watermark, which works well. The rail plan slots (`desk/CommandRail.tsx`), the order detail and the outcome cards still use the old Tabler `ActionIcon` (WP-4 not done; read in the code, not seen on screen) |
| States (available, unaffordable, invalid, needs target, queued, proposed) | Match spec 5.3. Unaffordable: amber border, desaturated plate, dashed seal holes, lock, reason and fix. Invalid: dashed edge, neutral plate with the icon still readable, alternative button. Needs target: keeps the family plate (good fix in 1ac8a6c). Queued: green border, check badge on the plate, ORDERED stamp (covers the seal, S4). Proposed: dashed amber |
| Danger orders confirm (11) | On the desk and the phone: clear, safe and not skippable by accident. Focus lands on Cancel, Enter on the default focus cancels (checked: the confirm closed and the card stayed available), and Esc or a click outside cancels. Accepting a recommended danger order does not ask twice (read in the code). On the compact map tiles it breaks (required 1). It may feel repetitive for Mass troops facing and Fund nuclear program over many months: watch the order log (`window.wcOrderLog()`) for repeated cancel-free confirms |
| Order log (`lib/orderLog.ts`) | No visible UI; no page errors in any session |
| Contrast guards | Not re-run here (verify passed); nothing on screen looked below AA |

## 3440x1440 (CEO) observations

- All orders sits in the desk's centre column: 5 tiles a row, about 880 px wide, with about 600 px empty on each side inside the stage (used width 0.52, largest gap 826 px). The column width is the RS-008 layout, not this branch. The taller tiles mean 2 group rows per screen.
- Month 1 as it opens is identical to shared (same audit row: used width 0.45, 943 px empty on the left).
- Month 2 Desk: the same layout as before. The staff rows now show the plate and DIPLOMACY chip in place of the scene thumbnail, which reads better. Hidden content up 68 px (small items).
- Map order menu: compact tiles read well at this size. The confirm face is broken (required 1).
- HUD shows "UA" letters where the stability screenshots showed a flag emoji. This branch does not touch the HUD. It is probably this capture's Chromium emoji font, not the build (not verified).

## Layout audit summary (RS-008 stays OPEN, expected)

Same seat and states as the stability review where they exist. Full tables: `design-review-order-cards/audit-desktop.txt`, `audit-tablet.txt`, `audit-phone.txt`. "Before" is `design-review-stability/re-audit-branch-*.txt`, the build that is now the shared branch.

| State | Size | Before | Branch | Difference |
|---|---|---|---|---|
| month-1 | all 7 sizes | as listed | identical | none (phone inner hidden 1,308 px vs 1,325) |
| month-2-desk | 3440, 2560 | 4 | 4 | +68 px hidden, +1 control below the fold |
| month-2-desk | 1920, 1440, 1366 | 3, 2, 2 | 3, 2, 2 | +68 px hidden |
| month-2-desk | 1024, 390 | 0, 0 | 0, 0 | +76 px hidden |
| month-2-map | all | 0 | 0 | none |
| m1-catalog (new state, no before) | 3440 / 1920 / 1366 | n/a | 3-4 / 2-3 / 2 | catalogue scroller 2,504 to 6,724 px hidden (RS-008 class); 2 covered invalid tiles at 1920+ (S4) |
| m1-catalog (new state) | 1024, 390 | n/a | 1, 1 | `your-move` missing while All orders replaces the stage (by design of the desk, not this branch); 4-5 cut nav tabs are the desk tab strip, not cards |

## Not exercised

- War and nuclear faces in the real game: Declare war is invalid for this seat (already at war) and Nuclear strike is invalid (no warheads). They were seen only in the gallery (`gallery-confirm-*`), including the hold-to-authorize button. Hold timing, Space or Enter held, and reduced motion were not tested.
- Mission-warning face in the real game (gallery only).
- The rail tray slots (`OrderSlot` with the 34 px plate) in the real game: not on screen in the states captured. Seen in the gallery tray only.
- 3840x2160, colour-blind simulation, greyscale check and the icon recognition bar: not run here (the design doc's numbers and the branch's guards cover them).
- Customer use of the confirm (whether it annoys over 12 months): needs the order log from iteration 4 sessions.
