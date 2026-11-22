# Stage progress and estimates

Data for `devloop/kit/progress.mjs`: where each iteration is in the loop, how long each stage took, what the rest should take, and how good those estimates were.

```
config.json      stage names, plan for the current iteration (units, size, notes), usage registry
stages.jsonl     the stage log: one event per line {t, iteration, stage, kind, units?, size?, note?}
estimates.jsonl  every estimate the tool made (appended on each run), compared later with what happened
```

## Stages
A stage starts when the orchestrator moves the stepper to it and ends when the next stage on the critical path starts. Work of an earlier stage that keeps running in parallel (a late design, a codex merge) counts toward the later stage, so the stage durations add up to the iteration's wall clock.

| Stage | Starts when | Ends when | Units, when declared |
|---|---|---|---|
| Plan | the goals for the iteration are being picked (usually during the previous triage) | the first design brief or build brief is written | goals |
| Design | the first designer agent is briefed | the first build agent starts | specs |
| Build | the first build agent starts | the last build package is merged | work packages |
| Verify | integration is done and the verify gate runs | the gate is green and QA has verified | gate fixes, QA checks |
| Use | the first customer session starts | the last session report is in | customer sessions |
| Triage | the last session report is in | patterns, decisions and the next plan are committed | clusters |
| Report | triage is committed | the status page, journal and the `iter-N` tag on main are published | |
| Gate | the report is out | pass (release candidate) or fail (next iteration) | |

A stage that does not run in an iteration is logged as `skip` (iteration 0 had no Design, Build, Verify or Gate; iterations 2 and 3 built from triage without a design stage). `pause` / `resume` mark time when the whole loop was idle (machine off, usage limit, waiting for the owner); durations are active time with pauses removed.

## Estimates
- **Current stage.** With units declared: progress = units done / total; time left blends the observed time per unit (weight done / (done + 2)) with the historical median scaled to the units left (a stage already longer than usual counts as a larger one). Without units: progress = elapsed / historical median, capped at 95% until the end event; time left is at least what the 75th percentile still allows.
- **Later stages.** The median active duration of that stage in earlier iterations, times a size factor (declared with `--size` or in `config.json`, else planned units / typical units).
- **Range.** 25th to 75th percentile of history; with fewer than 3 past runs, 0.6x to 1.6x.
- **Iteration.** Sum of the above; the finish time assumes no pause.
- **Tokens.** Weighted tokens (see `kit/usage-ledger.mjs`) attributed by time: every response in a stage's window counts to that stage, split evenly when windows overlap (iteration N's Plan runs during iteration N-1's Triage). Expected tokens are the history median per stage.

## Accuracy
Each finished stage is compared with the first estimate made for it: a live snapshot from `estimates.jsonl` when there is one, otherwise a backtest (the median of the earlier iterations, which is what the tool would have said). Error = |estimated - actual| / max(actual, 5 min). The status page shows the table, the median error per stage and per iteration; the trend should fall as history grows. Review it at every Report stage and adjust the method (size factors, stage definitions, units) when one stage stays off.

## Backfill (iterations 0 to 3)
Recorded on 2026-11-22 from evidence, marked `note: "backfilled"`: commit times on `dev/rc1-synthetic-loop` (setup, baseline, design start, merges, "paused at verify", "all packages merged, verifying", triage commits, status updates), the orchestrator windows in `../usage/registry.json`, subagent transcript start and end times (design, build, QA and customer agents), file times in `runs/iter-NN/`, and two idle gaps in the orchestrator transcript (10:50 to 11:37 UTC with no agent running, and the machine shutdown from 13:13 to 20:12 UTC). Boundaries are within a few minutes. Iteration 3 Verify carries 3 units: gate fixes, the staff-picks fix (RS-005) and QA verification; the plan for the rest of iteration 3 is in `config.json` (Use: 9 customer sessions in 2 waves; Report: publish iter-3 to main).
