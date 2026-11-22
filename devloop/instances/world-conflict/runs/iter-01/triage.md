# Iteration 1 triage (integrated build df9faa3)

Panel v1.2, 9 sessions (2 waves, GPU, no freezes). Learning aids and era map screens not yet in this build.

| Maya | Olivia | Ruth | Noah | Priya | Dan | Sam | Leo | Marcus | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| 7 | 6 | 6 | 6 | 6 | 6 | 6 | 7 | 5 | **6.2** (iter 0: 4.9) |

Weighted: feels like a game 6.9 (6.1), agency 5.9 (5.0), clarity 6.3 (5.4), visual 7.8, realism 5.7, replay 5.9. Quits: 1 of 9 (iter 0: 7 of 9). Reached the end: Maya, Noah, Leo (and Olivia's run ended). Friction kinds: blocked 3 (iter 0: many), naming 21, dashboard-feel 7.

## Clusters and decisions
| ID | Cluster | Weight | Sev | Decision |
|---|---|---|---|---|
| F-01-2 | Ending contradicts play (achievement after strikes, truth table vs ceasefire, verdict text) | 0.41 | S2 | Fix now (reveal consistency checks + tests) |
| F-01-1 | Country picker is a native dropdown | 0.40 | S2 | Fix now: tap-friendly country picker (flags, search, recent, map pick) shared by desk and map |
| F-01-4 | Too much at once (month 1, briefing goals, result card) | 0.45 | S3 | Rework: progressive disclosure in month 1, short briefing, varied result card art |
| F-01-3 | Numbers disagree / wrong attribution | 0.27 | S2 | Fix now (single source for deltas, attribution test) |
| F-01-5 | Unknown names | 0.60 | S3 | In progress (learning aids build, full codex merged) |
| F-01-6 | What to spend on, how much it does | 0.33 | S3 | Add: magnitudes on cards on expand; "Big move" suggestion when 3+ seals unspent |
| F-01-7 | Historical plausibility | 0.18 | S2 | Fix now: era filter for world events and AI pacts; B-17 non-existent states (in progress) |
| F-01-8 | Late months go flat | 0.27 | S3 | Next: D-49 retune staff autopilot; mid-game moments; branch-from-month (consider) |
| other S2 | Staff re-suggests Mobilize at 100%; side picker label stale | | S2 | Fix now |

## Gate check
Weighted recommend 6.2 (gate 7.0); Marcus 5 (floor 6); feels-like-a-game 6.9 and agency 5.9 (gates 7.0); Olivia and Ruth completed (Ruth would have quit). Gate not met: iteration 2.
