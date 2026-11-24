# Design re-check: DR-INT-1 to DR-INT-7 at 1920x1080

- Reviewer: the UX Designer and Art Director of `design-review-integrated.md`. No code changed, nothing committed.
- Build: worktree `WorldConflict-agenda`, branch `fix-design-review-iter4` at b48a4f5.
- Screen: 1920x1080, deviceScaleFactor 1. Own servers from that worktree (API 8750 `DB_DRIVER=json`, `WC_DAILY_DATE=2026-11-22`; UI 5750), stopped at the end. The gate on 8640 / 5640 was not touched.
- What I replayed: the original newcomer path (title, Hormuz Convoy, United States), months 1 to 4, with the original `play.mjs`. This time it also opened the Hold card and logged the band and every on-screen capital sentence at each step. Probes: Ask your staff (all six advisers), Map mode on the Gaza crisis in month 2, and Pick on the map from All orders. Screenshots are in `design-recheck-integrated/` (12 images, each one looked at).

## Verdict: APPROVED

All seven serious findings are fixed at 1920x1080. The fixes introduced nothing serious.

| id | result | what I saw | screenshot |
|---|---|---|---|
| DR-INT-1 | FIXED | Recommended orders and The move for your mission use full-width cards: the quote and the order name sit on one or two lines, and Choose sits to the right of the text. After Choose all, the "Your choice" badge sits beside the title without covering it, and Undo sits under the card. | `h-m2-05-after-choose-all.jpg`, `h-m1-03b-mission.jpg` |
| DR-INT-2 | FIXED | Months 1 to 4, every step: the band, the plan line ("◆ N now, ◆ x spent, ◆ y left, you start next month with ◆ z"), the Hold card ("After your other choices ◆ y is left, and you start next month with ◆ z") and the review page agree. Each month the next band matches what the plan said (1+3=4; 3+3=6; 2+3=5; 3+3=6). The one exception, month 3 opening at ◆ 5 rather than the promised ◆ 6, is the crisis's default answer (◆ 1) being counted from the start; the plan says so ("◆ 6 now, ◆ 1 spent, ◆ 5 left"). Order costs match the drop in the band: Reform program ◆ 2 took the band from 3 to 1, Spy on Iran ◆ 1 from 4 to 3, and Strike the IRGC naval bases ◆ 1 from 5 to 4. Covert sabotage now reads "costs ◆ 2 (◆ 1 more than leaving it)" and the band drops by 1. The result card no longer prints a capital line. | `h-m1-03b-mission.jpg`, `h-m3-11-review.jpg`, `h-m3-12-result.jpg` |
| DR-INT-3 | FIXED | Each adviser quote matches its card. "Puts no goal at stake" now appears only on answers with no goal tag (Coordinate sanctions and talks, Lean on the contributors). Goal-helping answers say "It helps your goals: ...", and month 1 says "The steadier answer, though it hurts voters stay on side". | `h-m3-02-call.jpg` |
| DR-INT-4 | FIXED | The "(+n more)" count now follows "Helps" and counts helps. Mixed answers name both sides: "Hurts: The Gulf still trusts you. Helps: Iran never tests a bomb and Voters stay on side." These tags agree with "Your goals in this call" beside them. | `h-m4-02-call.jpg` |
| DR-INT-5 | FIXED | Map mode centres the open crisis in the gap between the card and the plan: Iran for The January clock, Sanctions on Iran and Iran nears the threshold, and Israel / Gaza for Who will police Gaza?. During Pick on the map, the camera stays still before, during and after mouse movement. | `h-m3-09-map.jpg`, `g-02-map-gaza-m2.jpg`, `k-01-pick-start.jpg`, `k-03-pick-hover.jpg` |
| DR-INT-6 | FIXED | The panel is titled "Ask your staff" and uses "advisers". It has the desk's initials avatars and card style, and no emoji. Recommendations use the order vocabulary with a cost and a risk word ("Court Ukraine · ◆ 1 · Low risk", "Mobilize forces · ◆ 1 · Some risk"). No engine code appears in any of the six advisers' text. The suggested questions wrap, and the placeholder reads "Ask a question" in full. | `r-04-askstaff.jpg`, `r-04c-askstaff-defense.jpg` |
| DR-INT-7 | FIXED | Every row on Check what will happen names the item it answers on the left, then the choice, its effect, and its cost ("◆ 2" or "Free"), with Change beside it. The two "Promise full support" rows are told apart by their callers (Tusk, Erdogan). The open call is listed with what happens if it stays open, and the plan states the total ("◆ 6 now, ◆ 4 spent, ◆ 2 left"). | `h-m3-11-review.jpg` |

## Noted, not scored

- In some month 2 states (`h-m2-05-after-choose-all.jpg`, `g-02-map-gaza-m2.jpg`), the state band wraps onto a second row ("Your country", Approval, Stability, World tension, Score), and the screen below moves down by about 43 px. Nothing is wrong or hidden. I did not check whether this fix round introduced it. It is worth a look against the one-row band rule.
