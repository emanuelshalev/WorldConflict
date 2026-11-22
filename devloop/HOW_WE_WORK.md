# How we work (current state)

Version 1.2, 2026-11-22. Changed only through journal entries (`instances/*/journal.md`) and mirrored on the instance status page.

## Principles
1. **Customers decide, builders build.** Synthetic customers run in fresh sessions, blind to design intent and the goal list, on a different model from the builders where possible.
2. **Real signals win.** Owner and real-user feedback calibrates the panel; when they disagree, go with the real person.
3. **Spec before code** for anything user-facing: designer concept and interaction spec with acceptance criteria first.
4. **Every change is traceable**: ledger entry with evidence, alternatives, expected effect and a reversal condition.
5. **Never remove a capability** without an owner decision; improve, surface or make optional.
6. **Parallel by default, isolated when touching shared files**: independent workstreams run as parallel agents with narrow briefs; overlapping edits use separate worktrees or are sequenced.
7. **Verify before the panel sees it**: tests, lints, build, domain harnesses, smoke playtest through the real UI.
8. **Isolate agents and respect capacity**: each agent has its own port, scratch and output folder; at most about 1 browser persona per 5 CPU cores at once.
9. **Reach the end**: each usage round, at least 3 personas reach an end screen.
10. **Report often**: the status page and journal are updated at each stage so the owner can follow without asking.

## Iteration
| Stage | Who | Output |
|---|---|---|
| 1. Plan | Group Manager | 3 to 5 goals for the iteration, each tied to findings and gate criteria |
| 2. Design | Designer, UX, Art Director | Specs, concepts, acceptance criteria (`runs/iter-NN/design-*.md`) |
| 3. Build | Engineers (parallel agents) | Code, tests, ledger entries |
| 4. Verify | QA | Green checks, smoke playtest, regression checks, visual QA screenshots |
| 5. Use | Customer panel (blind, parallel) | Schema-valid session reports with screenshots |
| 6. Triage | Group Manager + QA | Clusters, reproduced bugs, decisions (`runs/iter-NN/triage.md`) |
| 7. Report | Group Manager | Status page, journal, tag `iter-NN`, push |
| 8. Gate | Group Manager | Pass: release candidate tag. Fail: next iteration |

Iteration 0 is special: interviews and a baseline usage round on the current build, before any building, so the first goals come from evidence.
