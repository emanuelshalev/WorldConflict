# Synthetic-customer development loop

How World Conflict is developed toward its public release candidate. Method: *Leveraging Synthetic Customers to Develop Your Product* (E. Shalev, 2026). The live view for the CEO is `dev_plan/project_status.html` (tabs: Iterations, Personas, How we work, Journal).

```
panel/        customer archetypes (versioned, evidence-tagged, weighted)
team/         development team charters (the builders)
real-signals/ real feedback (CEO, players) used to calibrate the panel
protocol/     interview, usage session, report schema, triage + release gate
scenarios/    what each archetype is trying to do, in their words
runs/iter-NN/ interviews, sessions, triage, findings, design notes per iteration
goals.md      release-candidate goals (from RS-001 and interviews)
ledger.md     decision ledger
journal.md    process learnings (newest at the bottom)
HOW_WE_WORK.md the current process (mirrors the status page tab)
```

## One iteration

1. **Plan** (Group Manager): read ledger, findings, real signals; pick 3 to 5 goals with gate criteria.
2. **Design** (Game Designer, UX Designer, Art Director): specs and concepts with acceptance criteria.
3. **Build** (Frontend and Engine Engineers): implement; one component per concept; tests.
4. **Verify** (QA): tests, lints, build, harness, Playwright smoke, visual QA, regression checks.
5. **Use** (customer panel, blind): each archetype plays the build through the UI; schema-valid reports.
6. **Triage** (Group Manager + QA): cluster, reproduce, weigh, decide, ledger.
7. **Report**: status page and journal updated; build tagged `iter-NN`.
8. **Gate**: release gate in `protocol/triage.md`. Pass: tag `v1.0.0-rc.N`. Fail: next iteration.

## Playtest kit

`scripts/playtest/kit.mjs` drives the real UI with Playwright (viewport per variant, screenshots, visible-controls dump, frame bursts for animation review). `scripts/playtest/smoke.mjs` is the QA smoke run.
