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
progress/      stage log, estimate snapshots and config for kit/progress.mjs
smoke.mjs      QA smoke playtest through the real UI
verify.config.mjs  the verify gate for this game (npm run verify)
regressions.yaml   every addressed finding and the guard that keeps it fixed
scenarios-qa/  acceptance scripts (orders, world map) and regressions/<id>.mjs finding guards
```

## Iteration

See `../../HOW_WE_WORK.md`. Release gate: `gate.md`. Builds are tagged `iter-NN`; a passing gate is tagged `v1.0.0-rc.N`.

## Playtest kit

`../../kit/kit.mjs` drives the real UI with Playwright. `node devloop/instances/world-conflict/smoke.mjs` is the QA smoke run (dev servers must be up: `npm run dev`).

## Verify gate

One command before every merge (runner `../../kit/verify-runner.mjs`, config `verify.config.mjs`). It starts its own API (JSON saves in the run folder, never `dev.db`) and Vite on free ports from 8640 and 5640, so it runs next to `npm run dev`. Logs and screenshots go to `.verify/` (gitignored, wiped per run).

| Command | Runs | Time (20-core dev box) |
|---|---|---|
| `npm run verify -- --quick` | registry check, `npm test`, biome, UI eslint, build | about 30 s |
| `npm run verify` | quick + balance bands, smoke (3 months), reveal fast-forward, visual regression, finding guards | about 7 min |
| `npm run verify -- --ui` | UI eslint, UI build, smoke, reveal, visual | about 3.5 min |
| `npm run verify -- --full` | default + orders and world map acceptance scripts | about 13 min |
| `npm run verify -- --balance` | balance bands only | about 11 s |
| `npm run verify -- --changed` | unit suites importing files changed since `origin/dev/rc1-synthetic-loop` (`VERIFY_BASE` overrides) and the finding guards whose `covers:` match; combine with `--full` to run them first, then everything | depends on the change |
| `npm run verify -- --update-visual` | rewrite the visual baselines after an intended UI change (review the PNG diff in the commit) | about 1 min |

Other flags: `--only a,b`, `--skip a,b`, `--bail`, `--list`, `--out <dir>`, `--serve` (just the two servers, for manual runs or writing a guard).

- **Visual regression** (`tests/visual/surfaces.visual.ts`, Playwright runner, baselines in `tests/visual/__screenshots__/`): the feel, moments, orders (1440, 390) and reveal (every stage at 1440, stages 0 and 7 at 390) galleries, the title screen with the daily flashpoint pinned to Hormuz Convoy (1440, 390), and the month 1 desk of Hormuz Convoy as the United States, seed 4242 (1440, 1024, 390). Fixed clock (22 Nov 2026), reduced motion, CSS animations off, the fake clock and SVG animations paused before each capture, software GL; WebGL canvases in the game and the ticker are masked. Tolerance: 20% per-pixel colour threshold, 1.5% of pixels. The HTML diff report is in `.verify/visual/report/`.
- **Balance bands** (`tests/balance/bands.spec.ts`, excluded from `npm test`, part of the default gate): 12 games (`BALANCE_GAMES`) per seat with smart, none and random on the Term core five plus Iran and three flashpoint seats, against the CLAUDE.md bands. Known gaps live in `tests/balance/exemptions.json` with a note (Iran Term; the random policy below its band, ledger D-49); exempt checks still print their measured value.
- **Finding guards** (`regressions.yaml`): `node devloop/kit/regressions.mjs devloop/instances/world-conflict/regressions.yaml check|run|changed`. Every fix adds an entry with its guard (`../../method/triage.md` step 7); `tests/regressions-registry.spec.ts` fails `npm test` when an entry loses its guard or a Done backlog item is missing.


## Progress and ETAs

The Iterations tab shows progress within the current stage, ETAs for the rest of the iteration and expected tokens, from `progress/` (method and stage definitions in `progress/README.md`). Record each transition with one command, then regenerate the page:

```bash
export PATH=$HOME/.local/share/node/current/bin:$PATH
P=devloop/instances/world-conflict/progress/config.json
node devloop/kit/progress.mjs $P --done 1 --note "gate-fixes merged"        # a unit of the current stage is finished
node devloop/kit/progress.mjs $P --start Use --total 9                      # closes Verify, starts Use with 9 sessions
node devloop/kit/progress.mjs $P --start Triage                             # closes Use
node devloop/kit/progress.mjs $P --start Plan --iteration 4                 # next iteration's plan (iteration defaults to the next one)
node devloop/kit/progress.mjs $P --skip Design                              # a stage this iteration does not run
node devloop/kit/progress.mjs $P --pause --note "machine shutdown"          # and --resume when work restarts
node devloop/kit/progress.mjs $P                                            # print the estimate
node devloop/kit/progress.mjs $P --inject dev_plan/project_status.html PROGRESS && node devloop/kit/page-check.mjs dev_plan/project_status.html
```

`--at <ISO time>` backdates an event. Use `--stage` / `--iteration` when the event is not for the current stage. Keep the plan for the rest of the iteration (units, size, notes) in `progress/config.json`. At each Report stage, read the Estimate accuracy table on the status page and note in the journal what to change.
