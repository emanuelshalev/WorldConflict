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
    metrics.md         what the loop measures each iteration
  kit/
    kit.mjs            Playwright kit: act by visible label, screenshots, control dumps, frame bursts
    driver.mjs, act.mjs persistent browser per persona, one command per shell call
    page-check.mjs     loads a page, visits every tab, fails on script errors
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
