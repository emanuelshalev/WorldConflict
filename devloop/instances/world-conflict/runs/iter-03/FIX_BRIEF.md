# Iteration 3 fix brief (shared)

Setup and rules: follow `devloop/instances/world-conflict/runs/iter-01/UI_BUILD_BRIEF.md` (worktree from the latest origin/dev/rc1-synthetic-loop, own ports, quality bar, checks before committing, commit trailer, do not push or merge). Evidence: `runs/iter-02/triage.md`, `runs/iter-02/patterns.json`, the sessions in `runs/iter-02/sessions/*.md|json` (screenshots `runs/iter-02/shots/<variant>/`), QA `runs/iter-02/qa-verify.md`. Decisions: D-56, D-58 in the ledger.

Every fix ships with a regression test that would have caught the reported case. Never remove a capability. If you regenerate benchmarks, resolve generated files per file (never one multi-path checkout); the repository test fails on conflict markers. In your final message list each finding with its evidence id, the guarding test, and anything not fixed.
- **Definition of done:** update the docs your change affects (docs/GAMEPLAY.md, docs/API.md, docs/ARCHITECTURE.md, CLAUDE.md) in the same branch, and add a regression-registry entry with a guard for every finding you fix.
