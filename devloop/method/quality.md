# Quality evaluation (version 1.0)

The release gate is a set of measurements, not a paragraph read by hand. Each instance declares what quality means for its product in `<instance>/quality.json` (schema: `quality.schema.json`, template: `../templates/quality.json`); `kit/evaluate.mjs` measures it from outputs the loop already produces and returns a scorecard with a verdict. The controller's Gate stage reads that verdict (`controller.md`), and the status page shows it with a trend per dimension (`status-page.md`).

Why: a prose gate is evaluated from memory and drifts (iteration 3: the gate was judged by hand in the triage, with verify coverage and noise argued case by case). A declared gate is reproducible, shows its trend, and makes measurement gaps visible instead of silently counting them as passes.

## What is generic and what is per product

| Generic (method, kit, templates) | Per product (instance) |
|---|---|
| The spec format: dimensions, metrics, source adapter and args, direction, threshold, noise band, cadence, blocking or informative, veto | Which dimensions exist (for a game: functional correctness, reliability, user experience, visual quality, performance, product value) |
| The status rules: pass, fail, within noise, not measured; staleness by cadence; the verdict rules | Thresholds and floors (from the instance `gate.md` and `goals.md`) |
| Built-in adapters over standard loop outputs: `verify` (controller record, `.verify/summary.json`), `registry` (regression registry at the commit), `table` (any markdown table: triage clusters, QA repro counts, control baselines, goal status), `feedback` (session reports and panel weights: weighted mean, persona minimum, quitters, completion, `tasks` flags, friction by kind), `real-signals`, `vitest-log` (perf runs), `visual` (baselines, last run) | Product adapters in an instance module named in `adapters` (World Conflict: `balance`, the harness band log) |
| Noise kinds: `none`, `fixed`, `derived` (k x the standard error the adapter reports; for session scores, the persona retest spread times sqrt of the sum of squared panel weights) | The noise choice per metric and why (every metric states it, including none) |
| Recording the verdict with the controller and the Gate rule (`accept`, `match`) | Whether a not-met iteration closes through Gate with an override, or the rule only guards a release |

## Status of a metric

- **pass / fail.** `higher`: value >= threshold passes; `lower`: value <= threshold; `bool`: value equals the threshold (default true).
- **within noise.** When |value - threshold| < band the metric is neither pass nor fail. A score of 6 against a floor of 6 with persona noise of 1 is undecided; 5 fails and 7 passes. Veto metrics have no band.
- **not measured.** The source has no measurement, or it is older than the metric's cadence. A stale measurement is never reported as a pass; its value, commit and age are still shown.

## Cadence and staleness

| Cadence | Fresh when | Typical metrics |
|---|---|---|
| per-commit | measured on the evaluated commit, or on a commit with the same code tree (the loop config's `code` globs) | verify, guards, registry, visual baselines, goal status read at the commit, real signals read at the commit |
| per-iteration | measured in the evaluated iteration: by its run folder (`runs/iter-NN`), its commit, or (failing both) its time between iteration tags | customer scores, completion, triage and repro counts, perf and harness logs |
| per-release | measured since the last release tag (`release.tagPattern`) and not after the evaluated iteration | slow or costly checks (accessibility audits, long harness runs) |

The evaluated commit is the iteration tag (`<tagPrefix>N`) when it exists, else the shared branch tip for the current iteration. Iterations without a tag have no commit, so their per-commit metrics are not measured: the trend says so rather than guessing.

## Verdict

1. A failing **veto** metric means **not met**, whatever else holds (open real signals at S2 or worse: the Goodhart guard, real people outrank the panel).
2. A failing **blocking** metric means **not met**.
3. A blocking metric **not measured** means **not met** (an instance may choose `verdict.notMeasured: "undecided"`).
4. A blocking metric **within noise** means **undecided**: measure again (replicates, control seeds) before calling it.
5. Otherwise **met**. Informative metrics never change the verdict; they show gaps the gate does not cover yet.

## Commands

```bash
node devloop/kit/evaluate.mjs <instance>/quality.json [--iteration N] [--commit ref] [--json] [--out file] [--no-trend]
node devloop/kit/evaluate.mjs <instance>/quality.json --record   # writes runs/iter-NN/quality-scorecard.json and records `quality` with the controller
```

`--record` stores the verdict as the `quality` gate (pass when met, fail otherwise, with the verdict and reasons in the record) on the evaluated commit. It refuses a scorecard for another iteration than the loop's. A rule such as `{ "on": "enter:Gate", "gate": "quality", "match": "code", "accept": ["pass"] }` then lets the loop enter Gate only with the gate met on the code being released, or with `loop override quality-gate --reason "..."` (which drafts a ledger row). `accept: ["pass", "fail"]` would only require that a scorecard exists.

## Adapters

An adapter is `(args, ctx) => measurement`, where a measurement is `{ value, at, commit, iteration, evidence, detail, se?, seNote? }` or `{ missing: "reason" }`. `ctx` gives the evaluated `iteration` and `commit`, `instDir`, `root`, the loop state, `git()`, `commitTime()`, `fileTime()` (the last commit time of a tracked file, else its mtime), `artifact(rel)` (a verify artifact in this checkout or the main worktree, with the commit of the run's summary when the same run wrote it), `runDir(n)` and the `metric` being measured. Keep product knowledge in instance adapters; a built-in adapter must work for any product that follows the method's file formats.

## Session reports and real signals

- Session reports may carry `tasks` (`end_reached`, `second_game`, or any instance task) as booleans (`report.schema.json`); until they do, task completion can be read from the triage's control table with the `table` adapter.
- Real signal files carry `Severity: S1..S4` and `Status: open|addressed` lines (template `../templates/real-signals/RS-000-template.md`). A signal without a status, or open without a severity, is unclassified and the veto metric is not measured until the Group Manager classifies it.

## Revising the spec

Changes to thresholds, noise or blocking flags are decisions: log them in the instance ledger with the evidence. When the scorecard disagrees with real playtests, the metrics are wrong, not the players (D-78 reversal condition).
