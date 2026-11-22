# Goals

Two tracks, both owned by the CEO (2026-11-21): **build a fantastic game**, and **discover and adopt the best agentic-AI development practices** for efficient, quick, high-quality development at scale. The game track gates the release candidate; the practice track is how we get there, and its learnings go into the reusable `devloop/` module.

## Track A: a fantastic game

Derived from the CEO playtest (RS-001) and confirmed or refined by the panel interviews and usage rounds. Each goal has acceptance criteria that QA verifies and the panel confirms. Goals can be refined (logged in the ledger) but not dropped without a CEO decision.

| ID | Goal | Acceptance criteria (abridged) | Source |
|---|---|---|---|
| G1 | **Never blocked without a reason and a way forward** | Unaffordable or invalid actions are shown as unavailable before the player picks them, with a one-line reason and the fix on the control itself; no generic "rejected after Execute" for anything predictable; repeated identical warnings are collapsed. | RS-001 |
| G2 | **Point at what you mean** | Any message that mentions a resource or element (political capital, order slots, defense budget, mission) highlights that element on screen; resources are labelled in full where they live. | RS-001 |
| G3 | **One vocabulary** | One name per concept everywhere (HUD, desk, map, previews, errors, docs); a glossary exists and is enforced by a test. | RS-001 |
| G4 | **Clear what is expected each month** | A first-time player can say what they are supposed to do on month 1 within 30 s; a visible "your move" guide with the mission next step; onboarding teaches by doing. | RS-001, round 1 |
| G5 | **Suggestions are visible and good** | Advisors' suggestions are prominent on every surface (desk and map), explain why this and why now in one line, are mission-aware, and can be accepted in one click. | RS-001 |
| G6 | **Desk and map parity** | Every order available from the desk for a target is available from the map for that target, through the same component, with the same preview, cost and reasons, and vice versa. | RS-001 |
| G7 | **A game, not a dashboard** | Art-directed, tactile, reactive UI: order cards, capital as a visible resource, motion and feedback on every action, consistent grid and alignment; Sam scores visual and feels-like-a-game >= 7. | RS-001 |
| G8 | **A wide audience** | Non-gamers (Ruth, Marcus) and teens (Noah) finish a first session without help; quick (Flashpoint) and long (Term/Legacy) sessions both score recommend >= 6 with the personas who prefer them; legible at 125% zoom and on a tablet. | CEO brief 2026-11-21 |
| G9 | **Learn and test real history** | After a session the player can see what really happened versus their outcome, and replay with a different choice to compare. | CEO brief 2026-11-21 |
| G10 | **The reveal: an end of game worth waiting for** | A staged, illustrated end sequence: verdict and grade, achievements unlocked, what went well and badly, how the leadership was perceived (public, allies, rivals, history), a timeline of key moments with timing, measured stats (approval, economy, stability, tension, wars, lives, deals) with charts, "what really happened" side by side, a comparable score with a ranking against past runs and other leaders (local leaderboard; per-seat best), and a clear "beat this next time" hook. Personas say they look forward to the end. | CEO RS-002 |
| G11 | **A world map that fits and tells the story of its era** | The title globe and in-game map fit the screen at every breakpoint; country names shown on the globe at readable zoom without collisions; choosing an era (1960, 1990, 2025, 2026) or a mode changes the map: stability shading, crisis and war icons, rival and alliance lines, blocs, all from that era's scenario data. | CEO RS-003 |
| G12 | **Learn as you play, without getting in the way** | Every leader, place, organisation, term and situation in game text can be explained in place (hover or tap on desktop and touch; an "i" for a deeper explainer of a paragraph or situation); explainers are accurate, short, layered (one line, then more); a familiarity setting (asked once, changeable in Settings) turns aids up or down so experts are not bothered; non-gamer and teen personas say they understood unfamiliar situations; experts say aids never got in the way. | CEO RS-003 |
| G13 | **Stability: fixed stays fixed** | Every addressed finding (CEO points, panel clusters, QA items, backlog) is listed in `regressions.yaml` with an automated guard; all guards pass on every merge and before every panel round; no finding is marked REGRESSED in a panel round; zero S1/S2 regressions between the last two iterations before the RC. | CEO 2026-11-23 |

## Track B: best agentic development practices

| ID | Goal | Measured by | Source |
|---|---|---|---|
| P1 | **Reusable method** | `devloop/` has no product-specific content outside `instances/`; a new instance can start from `templates/` | CEO 2026-11-21 |
| P2 | **Fast, safe iterations** | Wall-clock per iteration and changes shipped per iteration go up while regressions (smoke, tests, escaped issues) stay at zero | CEO 2026-11-21 |
| P3 | **Quality by construction** | Every shipped change has a ledger entry, a spec or test, and a QA check; verified-bug rate and decision traceability tracked | Method |
| P4 | **Parallel agents at scale** | Independent work runs in parallel agents with clear briefs and isolated worktrees where they touch the same files; merge conflicts and rework tracked | CEO 2026-11-21 |
| P5 | **Learning loop on the process** | Every iteration adds at least one journal entry with a process change, reflected in `devloop/HOW_WE_WORK.md`; cross-project lessons go to `devloop/LEARNINGS.md` | CEO 2026-11-21 |
| P7 | **Estimate and learn** | Every stage shows progress within the stage (work units done of total), ETA for the current and every later stage and the iteration, and expected consumption; estimates are logged and scored against actuals each iteration (median absolute error shrinks as history grows) | CEO 2026-11-23 |
| P6 | **Panel fidelity** | The panel predicts real signals (hold-out checks); evidence mix shifts toward observed | Method |

Release gate: see `../../method/triage.md` (gate thresholds) and `gate.md`.
