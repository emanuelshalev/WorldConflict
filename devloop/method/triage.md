# Triage protocol (version 1.0)

Sits between the panel and the backlog. Output: `<instance>/runs/iter-NN/triage.md` and `findings.json`.

1. **Collect** every friction, bug and suggestion from the session reports.
2. **Deduplicate and cluster** by cause, not by symptom. A cluster gets an id `F-NN-k` (iteration, index).
3. **Reproduce bugs.** QA re-runs the reported steps on the same build. Only reproduced bugs are filed; the verified-bug rate is tracked.
4. **Weigh.** Cluster weight = sum of panel weights of the personas who hit it. Real signals (RS-*) count as automatic priority.
5. **Decide** using thresholds set in advance:
   - **Fix now** if severity S1/S2, or weight >= 0.30, or it maps to an owner goal.
   - **Propose adding** a capability when a weighted share >= 0.30 fails at the same goal for the same reason across at least two archetypes and two consecutive builds (one build if it matches a real signal).
   - **Rework** when completion is acceptable but one archetype's time or retries are far worse.
   - **Never remove** a feature (instance rule, if the owner sets it). Low-use features are surfaced better or made optional instead.
6. **Ledger.** Every decision that changes the product gets an entry in `<instance>/ledger.md`.
7. **Regression registry.** Every finding marked fixed gets an entry in `<instance>/regressions.yaml` with at least one automated guard (a unit test, or a UI scenario that replays the customer's reproduction steps). The verify gate runs all guards before every merge and every panel round; a finding without a guard cannot be marked fixed. An entry has an id, a one-line title, the source, `covers:` globs (the code it guards, used by change-based selection) and guards: a unit test file plus test name substring, or a short scenario under `<instance>/scenarios-qa/regressions/<id>.mjs`. Scenario guards run several at a time against the same servers, so a scenario starts its own game and browser profile and writes only under the output folder it is given; one that cannot gets `serial: true` and runs alone. The meta-check fails when an entry has no guard, a guard file or test name disappears, or a backlog item marked Done is missing (format and checker: `kit/regressions.mjs`).
8. **Regression check on new feedback.** Before clustering a new round, compare its friction and bugs with the registry. A previously fixed finding that reappears is marked REGRESSED, treated as at least S2, and fixed before new work; the guard that missed it is strengthened.

## Release gate (template)
Each instance defines concrete thresholds in `<instance>/gate.md`. The template:
- Every goal in `<instance>/goals.md` verified by QA and confirmed by the panel.
- No open S1 or S2 finding, and no REGRESSED finding; every registry guard passes.
- Weighted recommend >= the instance threshold, no persona below its floor.
- The early-quitter persona completes a first session without quitting.
- The instance's own quality checks (tests, lints, build, domain harnesses) are green, run as one command (the verify gate, `kit/verify-runner.mjs`), with every finding guard in the regression registry passing.
