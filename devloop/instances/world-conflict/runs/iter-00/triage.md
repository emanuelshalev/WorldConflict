# Iteration 0 triage (baseline, build v0.9.0 / b271008)

Panel v1.1, 9 sessions, 9 interviews. Bug verdicts pending QA reproduction (`qa-repro.md`).

## Scores (recommend)
| Maya | Olivia | Ruth | Noah | Priya | Dan | Sam | Leo | Marcus | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| 6 | 3 | 4 | 4 | 5 | 5 | 6 | 5 | 6 | **4.9** |

Visual 7 to 8 everywhere, but feels-like-a-game 5 to 7, agency 3 to 7, clarity 4 to 7. Seven of nine would have quit; nobody reached the end of a game.

## Interview trade-off (weighted 100 points)
C1 see why before trying 15.1 · C3 clear move and goal 13.0 · C6 crafted game feel 13.0 · C10 real-world content 9.3 · C11 shorter month 9.2 · C8 big moments 7.8 · C4 suggestions 7.1 · C2 warnings point 6.1 · C7 vocabulary 4.9 · C5 parity 4.4 · C12 share 4.3 · C9 depth 3.4 (cut by 82%).

## Clusters
| ID | Cluster | Who (weight) | Goal | Decision |
|---|---|---|---|---|
| F-00-1 | Blocked with no reason: greyed orders silent, stale "Not enough political capital" toast, war never queued, capital shown two ways | Leo, Dan, Sam, Ruth (0.41) + RS-001 | G1 G2 G3 | Fix now (design-orders) |
| F-00-2 | Goal unclear: dead "Mission 2/4" pill, which move helps, score falls unexplained | Maya, Ruth, Dan (0.41) + RS-001 | G4 | Fix now (design-month) |
| F-00-3 | Walls of text, duplicated briefing, dense desk, unexplained abbreviations | Olivia, Noah, Maya, Ruth (0.54) | G4 G8 | Fix now (design-month, design-feel) |
| F-00-4 | Dashboard feel: no press feedback, empty stage, layout jumps, no stingers or sound | Sam, Olivia, Noah, Leo (0.41) + RS-001 | G7 | Fix now (design-feel) |
| F-00-5 | Contradictions: art vs outcome, check mark over a failed order, deltas disagree, "Your call" after approving | Sam, Priya, Maya, Ruth (0.50) | G7 | Fix now (S2) |
| F-00-6 | Generated prose: "Salman on After the...", drop-cap lede, "front moves l", identical leader replies, banner vs selection | Noah, Sam, Maya, Ruth (0.50) | G7 | Fix now |
| F-00-7 | Repetition: same crisis months 5/7/8, identical Home page, reused art | Dan, Priya, Maya (0.38) | G4 | Fix now (design-month) |
| F-00-8 | Approve all + Execute is an autopilot that wins | Dan, Priya, Leo (0.29) | depth | Rework (design-month), keep Approve all |
| F-00-9 | Month takes about 5 screens; debrief tab chips do nothing | Maya, Olivia (0.31) | C11 | Fix now (design-month) |
| F-00-10 | No real-world context in debriefs | Priya, Ruth, Marcus (0.31) | G9 | Next iteration (reveal covers the end) |
| F-00-11 | Replay: same seed and side-by-side runs | Marcus (0.08) + RS-002 ranking | G10 | Design now (design-reveal) |
| F-00-12 | Freezes and heavy rendering | all 9 | perf | QA to reproduce single-session; set an animation budget |
| F-00-13 | Enter in search queues a nuclear strike with no confirmation | Dan (0.10) | G1 | Fix now (S2 safety) |
| F-00-14 | Map press no feedback; map menu hides chance | Sam (0.09) + RS-001 | G6 | Fix now (design-orders) |
| F-00-15 | End of game not reached by anyone | escaped | G10 | Process: 3+ personas must reach the end (D-44) |

## Calibration check (RS-001 hold-out)
The recalibrated panel independently reported 6 of 7 RS-001 statements on the baseline: blocked with unclear reasons (Leo, Dan), the capital naming and visibility problem (Leo's toast vs meter, Sam's two representations), the dashboard feel (Olivia, Sam, Leo), unclear expectations (Maya, Ruth), parity gaps (Sam), the repeated message (Leo's stale toast). Missed: "where are the suggestions?" (the panel found the staff picks; it complained about autopilot instead). **Panel fidelity 6/7.** RS-002 (end of game) escaped: no persona reached it.
