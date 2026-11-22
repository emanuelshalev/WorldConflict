# Iteration 2 triage (build 5ef3ead, served locally)

| Maya | Olivia | Ruth | Noah | Priya | Dan | Sam | Leo | Marcus | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| 8 | 5 | 6 | 5 | 8 | 6 | 6 | 6 | 6 | **6.3** (iter 1: 6.2) |

Weighted: realism 6.4 (5.7), agency 6.2 (5.9), clarity 6.3 (6.3), feels like a game 6.6 (6.9), replay 5.5 (5.9). Quits: Olivia and Noah (briefing wall), Sam (desk/map), Marcus (replay). Reached the end: Maya, Olivia, Noah, Priya, Sam, Leo. Caveat: the reveal ran without benchmarks (merge accident, D-57).

| ID | Cluster | Weight | Decision |
|---|---|---|---|
| F-02-1 | Newcomers drown (auto-open briefing, text wall, unknown goal) | 0.23 + RS-001/003 | Fix: no auto-open at any level (opt-in only); month 1 states the one goal in a sentence; Guide me shows fewer words, not more |
| F-02-2 | Status words contradict outcomes (+ QA S2-1 attribution, reveal moments direction) | 0.46 | Fix: one outcome vocabulary from the engine (done / partly / failed / refused) with tests |
| F-02-3 | Wild moves lack consequences (nuke raised approval) | 0.09 | Fix: nuclear and war consequences per CLAUDE.md invariants; share card image |
| F-02-4 | Staff pre-spend capital, unclear staff effects | 0.20 | Rework (D-49 follow-up): staff orders proposed, not spent, until approved; effects shown before Approve |
| F-02-5 | Map/desk differ; Desk button dead with map menu open | 0.09 + RS-001 | Fix |
| F-02-6 | Replay discoverability; missing saved game | 0.08 | Fix: Replay/Play a seed from Saved games and title; investigate save loss (S2) |
| F-02-7 | Choose the opening war in One Term | 0.21 | Add: optional opening-crisis pick for One Term (default unchanged) |
| F-02-8 | Recycled/misattributed lines | 0.10 | Fix: speaker/quote checks |
| QA S1-2 | West Bank and 1960 Nigeria seats lost | | Fix per D-56 |
| QA AC3 | In-game globe 876 px at 1920 | | Fix: collapse map advisor row by default on desktop, fit includes goal line |

Gate: weighted 6.3 (7.0), Olivia and Noah 5 (floor 6), feels-like-a-game 6.6, agency 6.2. Not met: iteration 3.
