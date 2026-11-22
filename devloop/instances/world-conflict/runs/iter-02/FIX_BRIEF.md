# Iteration 2 fix brief (shared)

Setup and rules: follow `devloop/instances/world-conflict/runs/iter-01/UI_BUILD_BRIEF.md` (worktree setup from the latest origin/dev/rc1-synthetic-loop, own ports, quality bar, checks before committing, commit trailer, do not push or merge). Evidence: `devloop/instances/world-conflict/runs/iter-01/triage.md`, `patterns.json`, the session reports in `runs/iter-01/sessions/*.md|json` (screenshots in `runs/iter-01/shots/<variant>/`), and `runs/iter-01/backlog.md`. Decision: D-55 in the ledger.

Every fix ships with a regression test (unit or a scripted check) that would have caught the reported case. Never remove a capability. In your final message list each finding you fixed with its evidence id, the test that guards it, and anything you could not fix.
