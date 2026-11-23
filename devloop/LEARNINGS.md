# Learnings about the method (cross-project)

Lessons that would apply to any product using this loop. Newest at the bottom. Product-specific notes stay in the instance journal.

## 2026-11-21 · World Conflict, iteration 0
- **Synthetic panels drift toward patience and politeness.** Three rounds of personas rated visuals 7/10; the owner's first real playtest found the UI dashboard-like and blocking. Always include a skeptic and an early quitter from the start, and lower patience and reading depth by default.
- **Build the coverage matrix before the personas.** Writing personas first produced a panel of gamers; the owner's audience includes non-gamers and older news followers who need very different things (legibility, plain language, no hidden conventions).
- **Keep the method separate from the product** from day one so it can be reused; product details belong in an instance folder.
- **Track the process, not only the product.** Give the development practice its own goals and metrics, otherwise only product quality is measured.
- **Detect "reachable", not "visible", in UI automation.** A control behind a modal is visible but not clickable; Playwright's trial click checks what a player could actually press.

## 2026-11-22 · World Conflict, iteration 0 baseline
- **Cap concurrent browser personas by machine capacity** (about 1 per 5 cores for animated web apps). Overload produces fake freezes that pollute the findings.
- **Isolate every agent**: own port, own scratch folder, own output folder, persistent profile. Shared scratch space caused cross-talk.
- **Screenshot at CSS scale** so agents' tap coordinates match what they see.
- **Make reaching the end a requirement**: personas that quit early never test the ending, which is what real users remember.
- **Hold-out checks work**: keeping one real complaint secret and seeing whether the recalibrated panel finds it is a cheap fidelity measure.
- **Shared brief files** keep parallel agent prompts short and consistent; per-agent prompts only add identity, port and topic.
- **Check reports like code.** A status page edited by script shipped with a syntax error; `kit/page-check.mjs` now loads every tab and fails on script errors before any report is committed.
- **Audit the harness before trusting the panel.** Our first kit made controls look dead (role filter), hid dialogs, and starved the CPU (software rendering). Reproducing each bug with a human-like tap separated product bugs from harness bugs; 2 of 10 were the harness.
- **Navigate by structure, not by copy.** Test scripts that click by page names break when designers rename things.
- **Track consumption from day one, from the transcripts.** Exact usage is already logged per response; attributing it needs only consistent agent descriptions and stage boundaries. Weighted tokens (price ratios) make cache-heavy agent work comparable.
- **Parallel writers need a combine-and-check step.** When two agents write to one shared store, merge their branches in a scratch worktree and run the consistency checks before touching the main branch; name a single owner for shared entities in the briefs.
- **Briefs as files make work restartable.** A usage pause mid-round cost little because every stage had a brief file and agents could resume with their context.
- **Restart shared servers after data merges.** Long-running dev servers cache data per process; a feature can look broken (or absent) in review and to the panel only because the server serves stale data. Add an API payload check to the pre-panel checklist.
- **Do not carve exceptions out of a majority objection without testing them.** A concept-test objection held by most of the panel came back as a quit point for exactly the segment I had exempted. Default to the opt-in variant and test the exception with that segment.
- **Separate signal from noise in synthetic panels.** One session per persona with rotating scenario, seed and device makes 1-point score moves meaningless. Keep a fixed control scenario per persona across iterations, and weight behaviour (quit points, reproduced friction) over scores.
- **Make the regression gate one command.** Checks that depend on someone remembering to run them (UI smoke, acceptance scripts, balance bands, visual diffs) drift and get skipped; bundle them into a single gate required before merges and panel rounds.
- **Synthetic perception tests are noisy per item.** In a 9-persona icon recognition test, unchanged icons moved by up to 67 points between rounds (shuffle order, neighbours, sampling). Pooled scores were stable; single-item scores were not. Replicate (two shuffles per persona), average across rounds by item id, and redraw only consistent failures; never chase one round's per-item number.
- **QA before customers, not alongside.** Running hand QA in parallel with synthetic customer sessions saves about 30 minutes but lets the panel play a build QA would have stopped; the panel round costs far more than the wait. Also: a guard written for one surface of a shared component (one screen) misses the same regression on its other surfaces; enumerate every mount point.
- **Tests must not read the calendar.** Any product feature keyed to the date (a daily challenge, seasonal content) makes UI guards flaky at midnight. Give the feature an environment pin and set it in the gate's servers; assert shapes, not one day's content.
- **One full gate at a time per machine.** Two full verify runs in parallel (separate worktrees, separate servers) starve the browser steps; animated screens (a turning globe) then fail visual baselines. Queue full gates; run quick suites in parallel only.
