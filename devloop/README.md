# devloop: a synthetic-customer development loop

A reusable module for developing a product with **synthetic customers** in the loop: persona agents that are interviewed, use every build through the real UI, and report in a fixed format, while a team of builder personas reacts, every decision goes into a ledger, and real feedback calibrates the panel. Method: *Leveraging Synthetic Customers to Develop Your Product* (E. Shalev, 2026).

It is self-contained: nothing in `method/`, `kit/` or `templates/` knows about a specific product. Copy `devloop/` into another repository, create `instances/<your-product>/` from `templates/`, and run the same loop.

```
devloop/
  README.md            this file
  HOW_WE_WORK.md       the current process (kept up to date by the journal)
  LEARNINGS.md         cross-project learnings about the method itself (newest at the bottom)
  method/              product-agnostic protocols
    panel.md           how to build and weigh a customer panel (coverage matrix, evidence tags)
    team.md            builder roles and charter template
    interview.md       fixed interview protocol (problem, concept, 100-point trade-off, objections)
    usage-session.md   fixed protocol for a persona using a build
    report.schema.json fixed session report schema
    triage.md          clustering, reproduction, decision thresholds, release gate template
    calibration.md     using real signals to correct the panel
    customer-advocate.md the Customer Advocate role, the customer record, the keep list, forecasts and their review
    metrics.md         what the loop measures each iteration
    controller.md      what the loop controller decides vs what the AI decides, the override path
    status-page.md     status page update protocol: tiers by loop event, generate not copy, freshness stamps
    quality.md         the release gate as metrics: spec format, noise, staleness, verdict (schema quality.schema.json)
    layout-audit.md    when and how to measure that a screen uses its space and hides nothing
  kit/
    kit.mjs            Playwright kit: act by visible label, screenshots, control dumps, frame bursts
    driver.mjs, act.mjs persistent browser per persona, one command per shell call
    page-check.mjs     loads a page, visits every tab, fails on script errors
    verify-runner.mjs  the verify gate: one command for every merge check (config per instance)
    customer-record.mjs generates the linked customer record (per customer, per project state) from all rounds
    regressions.mjs    findings regression registry: checker, guard runner, changed-file selection
    layout-audit.mjs   layout audit: inner scrolling, content below the fold, used width, cut off and covered controls
    feedback-digest.mjs builds per-iteration customer feedback data for status pages
    usage-ledger.mjs   token consumption by role, persona, stage, iteration and time from session transcripts
    progress.mjs       stage log, progress within a stage, ETAs for the rest, expected tokens, estimate accuracy
    loop.mjs           loop controller: stages, legal transitions, gate records, preconditions, overrides
    merge.mjs, publish.mjs  merge into the shared branch / publish an iteration, only when the controller allows
    install-hooks.mjs  installs hooks/pre-push.mjs (publish rules on push)
    status-refresh.mjs status page refresh by tier: injectors, generated sections, as-of stamps, owed hand fields
    evaluate.mjs       quality scorecard from existing outputs: pass / fail / within noise / not measured, verdict, trend
    hooks/             pre-push.mjs, guard-bash.mjs (Claude Code PreToolUse guard), README.md (installation)
  templates/           starting files for a new instance
  instances/
    world-conflict/    the first instance (a geopolitical strategy game)
```

## The loop

```
plan -> design -> build -> verify -> use (blind panel) -> triage -> ledger -> report -> gate
  ^                                                                              |
  +------------------------- calibrate with real signals <-----------------------+
```

## Starting a new instance

1. `cp -r devloop/templates devloop/instances/<product>`.
2. Write `protocol/concept.md` (a neutral paragraph) and `protocol/candidates.md` (10 to 12 outcome-phrased candidates).
3. Build the panel with `method/panel.md`: fill the coverage matrix first, then one YAML per archetype, including a skeptic and an early quitter.
4. Write team charters from `method/team.md`, adapted to the product.
5. Write `goals.md` and `gate.md` from the owner's brief; start `ledger.md` and `journal.md`.
6. Write an instance smoke script with `kit/kit.mjs` (requires `playwright` as a dev dependency; set `DEVLOOP_BASE_URL`).
7. Iteration 0: interviews, a baseline usage round, and triage before any building.

## Reporting
`kit/feedback-digest.mjs <instance> <n> --inject <page.html> FEEDBACK` turns each iteration's session reports, interviews, panel weights and the curated `runs/iter-NN/patterns.json` (written during triage) into the per-iteration feedback browser on the status page. Run `kit/page-check.mjs` afterwards.

## Consumption
`kit/usage-ledger.mjs <instance>/usage/registry.json --inject <page.html> USAGE` reads the orchestrator and subagent transcripts (Claude Code keeps them under `~/.claude/projects/<project>/`), de-duplicates responses and attributes tokens using the registry: time windows for the orchestrator, description rules for subagents (role, group, persona, stage, iteration). Name every agent with a description that its rule can match (for example `Customer Maya iter-1 session`, `Design: ...`, `Build: ...`). Weighted tokens use standard price ratios (cache read 0.1x, cache write 1.25x/2x, output 5x) so different token types compare in one number. Template: `templates/usage-registry.json`.

## Progress and estimates
`kit/progress.mjs <instance>/progress/config.json` keeps a stage log (`stages.jsonl`: start, end, skip, unit-total, unit-done, pause, resume) and estimates from the loop's own history: progress within the current stage (units done / total when declared, else elapsed time against the median of past runs of that stage, capped at 95% until the end), time left for it, an ETA for every later stage (median, scaled by a size factor), the iteration total with a finish time, and expected weighted tokens per stage (from `usage-ledger.mjs`, attributed by the stage time windows). Ranges are the 25th to 75th percentile of history. Each run appends its estimate to `estimates.jsonl`; finished stages are compared with the first estimate made for them (or a backtest from earlier iterations) and the median absolute percentage error per stage and per iteration shows whether estimates improve. Record each transition with one command (`--start Use --total 9`, `--done 1 --note "..."`, `--end`, `--skip Design`, `--pause`, `--resume`; `--at` backdates), and render with `--inject <page.html> PROGRESS`. Template: `templates/progress-config.json`.

## The loop controller
Orchestration is code; judgment stays with the Group Manager (`method/controller.md`). `kit/loop.mjs` keeps the loop's state (`instances/<product>/loop/state.json`, append-only `events.jsonl`, in the main worktree so every worktree records to one place) and refuses what the instance config forbids: entering a stage whose gates have not passed on the current code (`advance`, `start`), merging without a verify pass on the merge result (`merge.mjs`), publishing without a verify pass on the exact commit (`publish.mjs`, the pre-push hook), dangerous git commands in the shared checkout (`hooks/guard-bash.mjs`). Gate results are `record`ed on a commit and its code tree (a hash of the files the config calls code, so docs commits keep a pass); the verify runner records itself. `override <rule> --reason` lets a rule pass for a while and drafts a ledger row. Every transition feeds `progress.mjs` and the status page. Template: `templates/loop-config.json`. The status page follows `method/status-page.md`: `kit/status-refresh.mjs <instance>/status-protocol.json --tier T0..T4` regenerates every section of a tier (template `templates/status-protocol.json`), and the controller blocks the next transition while a refresh is owed.

## The verify gate
No merge should depend on someone remembering which checks to run. `kit/verify-runner.mjs <config.mjs> [flags]` is a product-agnostic runner: the instance config (`instances/<product>/verify.config.mjs`) lists steps (a command, its cwd and env, which servers it needs, a log summariser) and modes (flag to step ids). The runner picks free ports, starts the servers the selected steps need, waits until they answer, runs the steps in order (keeps going after a failure unless `--bail`), writes one log per step plus `summary.json` to a run folder that is wiped each time (`--out` to run several in parallel), stops the servers, prints a summary table and exits non-zero on any failure. `--list` shows the modes and steps, `--only a,b` / `--skip a,b` pick steps by id, `--serve` only starts the servers for manual work. A good gate has a quick mode (tests, lints, build: seconds to a minute), a default mode for every merge (plus browser smoke, an end-to-end fast-forward, visual regression, the finding guards) and a full mode (plus domain harnesses and long acceptance scripts).

Visual regression belongs in the gate only for surfaces that are deterministic: fixture galleries, and real screens started from a fixed seed with a fixed clock, reduced motion, CSS animations disabled, time stopped before the capture and masks over anything live (maps, tickers, dates). Baselines are committed next to the specs, with a documented update flag, and thresholds loose enough for font antialiasing.

Domain harnesses with targets (balance bands, performance budgets) get an opt-in test kept out of the default unit run, with known gaps in a JSON exemption file that says why: an exempt check is still measured and printed, so a gap is visible instead of hidden.

## The findings regression registry
`instances/<product>/regressions.yaml` lists every finding a fix addressed (real signals, triage clusters, QA items, backlog items marked Done), each with at least one guard: a unit test (file plus test name substring) or a short UI scenario that replays the customer's repro (`node <script> <outDir> <baseUrl> <apiUrl>`, exit code is the verdict). `kit/regressions.mjs <registry> check` is the meta-check (no guard, a missing guard file or test name, a Done backlog row not listed); `run` runs every guard and prints a per-finding table; `changed --base <ref>` maps the files changed since a base to the unit suites that import them and the findings whose `covers:` globs match, and runs those first. Script guards run `--jobs N` at a time (or `DEVLOOP_GUARD_JOBS`; default 1, one after another), sharing the gate's servers: each must start its own game and browser profile and write only under its `<outDir>`, and a guard that cannot, or that is timing-sensitive under load, carries `serial: true` on its guard entry and then runs alone. In parallel the slowest guards of the last run start first (times kept in `node_modules/.cache/devloop/guard-times.json`); a line is printed as each guard ends, and the per-finding table and summary line keep registry order. Each guard has 5 minutes. A finding that is not fixed yet can carry `status: open`: its guard runs and is reported (OPEN, or OPEN-PASS once it passes) without failing the gate; the fixing build removes the flag. Wire `check` into the quick mode and `run` into the default mode of the verify gate, and make the triage step "every fix adds a registry entry with its guard" (`method/triage.md`).

## Quality scorecard
The release gate is declared per instance in `quality.json` (dimensions and metrics with a source adapter, threshold, noise band, cadence, blocking or informative, veto; template `templates/quality.json`, schema `method/quality.schema.json`). `kit/evaluate.mjs <instance>/quality.json [--iteration N]` scores it from outputs that already exist (verify records and logs, the regression registry, triage and repro tables, session reports, real signals, perf logs, visual baselines) and prints the verdict (met, not met, undecided within noise), its reasons and the trend; `--record` stores it as the `quality` gate the controller's Gate rule reads. The status page gets it through the `quality` generator of `status-refresh.mjs`. Rules in `method/quality.md`.
