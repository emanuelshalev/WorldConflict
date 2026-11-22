# Release-candidate goals

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

Release gate: see `protocol/triage.md`.
