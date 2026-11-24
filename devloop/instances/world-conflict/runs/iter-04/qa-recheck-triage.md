# QA re-check: triage fix-now clusters F-04-1 to F-04-10 (iteration 4)

Branch `fix-triage-iter4`, worktree `WorldConflict-agenda`, own servers 8760/5760, Playwright at 1920x1080, customers' seeds. No code changes, nothing committed. In every session: 0 page errors, 0 console errors, 0 dialogs, 0 external or failed requests.

## Verdict

**Not all ten are FIXED.** 8 FIXED, 2 PARTLY (F-04-1, F-04-9). The F-04-1 fix also caused a new S2 layout collapse on crisis answer cards at political capital 0. The truth sweep found one untrue S2 on the result card and paper. It predates this round.

| Cluster | Repro (seed, month) | Result | Evidence |
|---|---|---|---|
| F-04-1 unaffordable answer / Remove | NOAH1 m2, RUTH1 m2 | **PARTLY** | The mission move card at ◆0 says "Needs ◆ 1, you have ◆ 0. Remove an order (frees ◆ 1), or wait", and Choose is disabled. On NOAH1, "Remove a staff order" removed one Recommended order (3 to 2, ◆0 to ◆1). On RUTH1, "Remove Spy on Afghanistan (frees ◆ 1)" removed exactly that order. **NEW S2, caused by this fix (6aef9cd):** on crisis answer cards at ◆0 (NOAH1 m2 "Incident with Sudan", RUTH1 m2 assassination attempt), the cards collapse into narrow overlapping columns. The text overlaps the question, the other cards and "Leave it open", and is unreadable. | `f04-1-noah-m2-move-at-0.png`, `f04-1-NEW-crisis-cards-collapse-at-0.png` |
| F-04-2 no "A quiet month" | NOAH1 m5, Execute only | **FIXED** | Month 5: "Left open: Ride it out, DONE ... Approval -6". Month 3: "Left open: Sanctions and silence". Minor and pre-existing: the paper headline still says "Zayed decides". | `f04-2-noah-m5-left-open.png` |
| F-04-3 mission line names whose view | MAYA1 m5 | **FIXED** | "Mission (Keep Washington engaged): your view of the United States 43 → 48". | `f04-3-maya-m5-mission-line.png` |
| F-04-4 "Political capital left" equals plan | MAYA1 m1 to 12 | **FIXED** | The band reads "Political capital left ◆ n of 6", equal to the plan's "left" in every month (m1: 3 and 3 left). | `f04-4-maya-m1-band-and-plan.png` |
| F-04-5 verdict does not claim a peace | PRIY1 and MAYA1 to the reveal | **FIXED** | PRIY1: MISSION FAILED, "Keep Ukraine standing". MAYA1: MISSION COMPLETE, "Keep Ukraine standing"; the seal "A Peace That Holds" is locked (UK 93+ unmet); Truth says "The guns fell silent in month 12". Verdict, seal and Truth agree. | `f04-5-priya-verdict.png` |
| F-04-6 Next month fully on screen | MAYA1 m1 to 8 (all 12) | **FIXED** | The bottom of Next month is at about 1041 of 1080 in all 12 months, including the result card with the "Remember General strike?" banner. | `f04-6-maya-m7-next-on-screen.png` |
| F-04-7 act of war leads, struck leader not warm | T2026-RUS-DAN01 strike, QU-CHN-LEO01 m6 "Strike first" | **FIXED** | DAN: "Strike nuclear sites in Turkey: it failed" leads the card and the paper, FAILED with its reason; Erdogan: "denounce Russia". LEO m6: "Strike first" leads the card and the paper; the chip reads "President Lai slams the phone down". | `f04-7-dan-strike-leads.png`, `f04-7-leo-m6-strike-first-leads.png` |
| F-04-8 no seat count or tally in art | UN, parliament, election scenes | **FIXED** | The UN board shows no tally; the parliament art reads "DIVISION YES NO" with no counts; the election art reads "PROJECTION SEATS" with no number. | `f04-8-un-board-no-tally.png` |
| F-04-9 reasons printed, staff do not suggest refused orders | PRIY1 m1 to 12, DAN | **PARTLY** | Every REFUSED or FAILED row prints its reason ("Relations with the United Kingdom are as good as they get"; "repelled by air defenses"). Not fixed: in PRIY1 m5 the Foreign Minister recommended the mission move Court UK ("needs 93+, now 90"), and it was REFUSED once a same-month crisis answer raised the relation to the cap. The fix (advisors.ts `COURT_CAP_MARGIN`) only covers a goal already met near the cap, not one the same month's answers push to the cap. | `f04-9-priya-m5-refused-with-reason.png` |
| F-04-10 debt shown as a plausible percent | T2026-RUS-DAN01 m1 | **FIXED** | Finance Minister: "Debt-to-GDP ratio is 20%"; no "debt hampers growth". | `f04-10-dan-finance-debt.png` |

## Truth sweep: CO-UKR-MAYA1, 12 months, result card and front page compared with the turn report

The numbers on the card match the turn report in every month: status, choice, facts, deltas, score and tension.

| Severity | Finding | Caused by this round? |
|---|---|---|
| **S2** | In month 12 the player chose "Sign the ceasefire" (DONE), and the card then says "Not from your choice: the war with Russia is over". The paper also credits it elsewhere ("Elsewhere, Zelensky answered 'The signing table' with 'Sign the ceasefire'"). This is untrue: the ceasefire was the player's choice. PRIY1 m12 shows the same. Source: `ResultCard.tsx`, the `meanwhile = own && warHl` line and the "Not from your choice" line. | No (code from e46fb5b, before this round) |
| S3 | The paper's body gives the choice's intermediate approval ("rose from 63% to 68%", "fell from 52% to 40%") rather than the month's total (70, 42). | No |
| S3 | War headlines exaggerate: "UKRAINE SMASHES THROUGH DEFENSES" for a front move of +1 or +2. Month 6 contradicts itself ("Front cracks ... as brigades run out of infantry"). | No |
| S3 | "World tension 69 → 58 (war weariness weighs on the public mood)": the reason does not match the drop. | No |
| S3 | Other seeds: the Leo paper body says "General Secretary Jinping" (surname bug in the paper body). | No |

Screenshot: `sweep-NEW-not-from-your-choice-ceasefire.png`.
