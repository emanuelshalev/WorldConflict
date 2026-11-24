# New month screen: check of the review findings (D-86, D-87)

Date: 2026-11-24. By: Group Manager. Reference screen: 1920x1080.

Under D-86 a UI package merges on the automated gate plus a check of the listed findings; the one full design review of the integrated build runs in the design pass. This note is that check for `design-review-month-screen.md` (not approved on 86a753c).

| Finding | Fix | Checked how | Result |
|---|---|---|---|
| S1-1 All orders catalogue cut off at every desktop size | One tab per order family with its count, one panel that steps from tiles to compact to rows; a danger order's confirmation takes the panel (c44a58b) | Screenshot at 1920x1080 (Military tab, 8 tiles, all inside the frame, no scroll); guard DR-MS-1 at five sizes through the declare war confirmation | Fixed |
| S2-1 Month list clips its own rows | Rows step down and fold with "n more to do" / "n done"; the current row, open calls and "Your own orders" never fold (c44a58b) | Screenshot at 1920x1080 after Choose all recommended (9 rows whole, "Your own orders" above the ticker); guard DR-MS-2 with 0, 1 and 6 own orders, desk and map | Fixed |
| S2-2 Review page names the wrong outcome | "Not decided (n)" rows say "If you execute now: ..." from `executeMeaning` in `ui/src/lib/agenda.ts` (c44a58b) | Guard DR-MS-3 compares the page with the request sent and the turn report, months 2 and 4 | Fixed |
| S2-3 Adviser voices contradict the card | Voices come from the engine's call cards; "your advisers disagree" only when they do (c44a58b) | Screenshot at 1920x1080 (General strike: Interior Minister and Finance Minister each on their own answer, heading says they disagree); guard DR-MS-4 on Hormuz months 2 to 5 and Quarantine China months 1 to 4 | Fixed |

Also in this round: Ask your staff hides first when the crisis screen compacts (07db043); fonts ship with the game at pinned versions (c34d056); the result card shows Next month without scrolling at 1920x1080 (2fe14d8, guard RS-008).

Carried to the design pass (the full review at 1920x1080): mission move cards on wide screens (S2-4), Map mode not centring on its subject, wide-screen layout of See everything, the paper and the review page, the capital number in the band after Execute, and the scaling rule of D-87. Carried to the later screen-size pass: phone items (Next month over the paper's masthead, buttons under 44 px, Ask your staff in compact layouts).

Verdict: the four findings are fixed; the package may merge on a green gate.
