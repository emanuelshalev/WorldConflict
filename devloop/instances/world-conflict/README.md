# World Conflict instance of devloop

How World Conflict is developed toward its public release candidate, using the reusable method in `../../` (see `../../README.md` and `../../HOW_WE_WORK.md`). The live view for the CEO is `dev_plan/project_status.html` (tabs: Iterations, Personas, How we work, Journal).

```
panel/         9 customer archetypes + coverage matrix (versioned, evidence-tagged, weighted)
team/          builder charters for this game
real-signals/  real feedback (CEO, players) used to calibrate the panel
protocol/      concept and candidates for interviews (the protocols themselves are in ../../method/)
scenarios/     what each archetype is trying to do, in their words
runs/iter-NN/  interviews, sessions, triage, findings, design notes per iteration
goals.md       track A (game, G1-G9) and track B (practice, P1-P6)
gate.md        release-candidate gate for this game
ledger.md      decision ledger
journal.md     process learnings (newest at the bottom)
smoke.mjs      QA smoke playtest through the real UI
```

## Iteration

See `../../HOW_WE_WORK.md`. Release gate: `gate.md`. Builds are tagged `iter-NN`; a passing gate is tagged `v1.0.0-rc.N`.

## Playtest kit

`../../kit/kit.mjs` drives the real UI with Playwright. `node devloop/instances/world-conflict/smoke.mjs` is the QA smoke run (dev servers must be up: `npm run dev`).
