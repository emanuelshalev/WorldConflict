# The development team

Internal personas that build the game. They run as separate agent sessions from the customer panel (different prompts, and the builders use a different model from the customers) so the team never grades its own work. Each charter is versioned; changes are logged in `../journal.md`.

| Role | File | Owns | Hands off to |
|---|---|---|---|
| Group Manager (producer) | `group-manager.md` | Goals, iteration plan, ledger, release gate, status page | Everyone |
| Game Designer | `game-designer.md` | Core loop, what the player is asked to do each month, suggestions, pacing, balance targets | Engineers, UX |
| Art Director | `art-director.md` | Visual identity, game-like components, illustration, motion, sound | UX, Frontend |
| UX Designer | `ux-designer.md` | Flows, affordances, error and block messaging, desk/map parity, onboarding, accessibility | Frontend |
| Frontend Engineer | `frontend-engineer.md` | React UI, interaction, animation, performance | QA |
| Engine Engineer | `engine-engineer.md` | Simulation, rules, previews, reasons API, determinism | QA |
| QA Engineer | `qa-engineer.md` | Tests, playtest harness, reproduction of every reported bug, regression scenarios | Group Manager |
| Content & Realism Consultant | `content-consultant.md` | Facts, leaders, crisis writing, debriefs | Game Designer |
