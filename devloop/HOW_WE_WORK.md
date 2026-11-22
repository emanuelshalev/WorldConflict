# How we work (current state)

Version 1.5, 2026-11-23. Changed only through journal entries (`instances/*/journal.md`) and mirrored on the instance status page.

## Principles
1. **Customers decide, builders build.** Synthetic customers run in fresh sessions, blind to design intent and the goal list, on a different model from the builders where possible.
2. **Real signals win.** Owner and real-user feedback calibrates the panel; when they disagree, go with the real person.
3. **Spec before code** for anything user-facing: designer concept and interaction spec with acceptance criteria first.
4. **Every change is traceable**: ledger entry with evidence, alternatives, expected effect and a reversal condition.
5. **Never remove a capability** without an owner decision; improve, surface or make optional.
6. **Parallel by default, isolated when touching shared files**: independent workstreams run as parallel agents with narrow briefs; overlapping edits use separate worktrees or are sequenced.
7. **Verify before the panel sees it**: tests, lints, build, domain harnesses, smoke playtest through the real UI.
8. **Isolate agents and respect capacity**: each agent has its own port, scratch and output folder; at most about 1 browser persona per 5 CPU cores at once.
9. **Check reports like code**: run `kit/page-check.mjs` on any status page before committing it.
10. **Reach the end**: each usage round, at least 3 personas reach an end screen.
11. **Measure consumption**: every agent gets a description its usage rule can match; the orchestrator logs stage boundaries in the usage registry; consumption is regenerated with each status update.
12. **Fixed stays fixed.** Every addressed finding gets an automated guard in the regression registry before it is marked fixed. One command (`verify`) runs all tests, lints, build, UI smoke, visual regression, balance bands and every guard; it must pass before any merge and any panel round. New feedback is checked against the registry first; a regressed finding is at least S2 and is fixed before new work.
13. **Docs follow the code.** A work package is done only when the docs it changes (player guide, API, architecture, agent guidance) say what the code now does.
14. **Compare like with like.** Each persona replays a fixed control scenario every iteration plus one rotating scenario; single-score moves of one point are noise unless behaviour backs them.
15. **Report often**: the status page and journal are updated at each stage and after every merge, so the owner can follow without asking.
16. **Orchestration is code, judgment is ours.** A deterministic controller (`kit/loop.mjs`, `method/controller.md`) owns stage transitions, mandatory gates (verify on the exact commit before merge and publish, QA before the customer round, status refresh after a merge) and the record of every transition; the Group Manager owns priorities, severity, trade-offs and what feedback means. Merges and publishes go through `kit/merge.mjs` and `kit/publish.mjs`, hooks block the dangerous git commands in the shared checkout, and a rule is skipped only with `loop override <rule> --reason`, which drafts a ledger row.
17. **Estimate and learn**: record every stage transition (and units of work done) with `kit/progress.mjs` (the controller does it on every `loop advance`), so the status page shows progress and ETAs from our own history; review estimate accuracy at each Report stage and adjust the method when a stage stays off.

## Iteration
| Stage | Who | Output |
|---|---|---|
| 1. Plan | Group Manager | 3 to 5 goals for the iteration, each tied to findings and gate criteria |
| 2. Design | Designer, UX, Art Director | Specs, concepts, acceptance criteria (`runs/iter-NN/design-*.md`) |
| 3. Build | Engineers (parallel agents) | Code, tests, ledger entries |
| 4. Verify | QA | `verify` gate green: tests, lints, build, smoke, visual regression, balance bands, every regression guard |
| 5. Use | Customer panel (blind, parallel) | Schema-valid session reports with screenshots |
| 6. Triage | Group Manager + QA | Regression check against the registry first, then clusters, reproduced bugs, decisions; every fix adds a guard |
| 7. Report | Group Manager | Status page, journal; after a green verify gate, fast-forward `main` to the finished iteration and tag it `iter-N` so the owner can playtest it from `main` |
| 8. Gate | Group Manager | Pass: release candidate tag. Fail: next iteration |

Iteration 0 is special: interviews and a baseline usage round on the current build, before any building, so the first goals come from evidence.
