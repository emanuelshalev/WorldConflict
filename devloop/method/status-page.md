# Status page update protocol

The status page is how the owner follows the loop without asking. It must be current as a whole, but its sections change at different speeds. This protocol fixes, for every section, **when** it must be updated, **where** its data comes from and **who** writes it. Product specifics (the page file, section names, sources) live in the instance file `status-protocol.json`.

## Principles

1. **Generate, never copy.** Any section whose facts exist in a file (sessions, ledger, goals, journal, registry, progress, usage) is injected from that file by a kit script. A hand-kept copy of generated data is a defect: it falls behind silently (iteration 3: the recommend table missed a whole iteration).
2. **Hand-write only judgement.** The few narrative fields (what is happening now, an iteration's highlights and lowlights, decisions waiting for the owner) are written by the Group Manager, short, in plain words.
3. **Update by event, not by memory.** Each section belongs to a tier, and each tier is triggered by loop events. The loop controller (`controller.md`) marks a refresh as owed when the event happens and blocks the next transition until it is done.
4. **Every section says how fresh it is.** Each section carries an as-of stamp (time and commit). The page check fails when a section is older than the last event of its tier.
5. **One command.** `node devloop/kit/status-refresh.mjs <instance>/status-protocol.json --tier <T>` runs every injector of that tier and the ones below it, stamps the sections, then runs the page check. Hand-written fields are flagged as owed in its output when their tier fired since their stamp.

## Tiers

| Tier | Trigger (loop event) | What it covers | Source |
|---|---|---|---|
| **T0 live** | every stage transition, progress event, pause or resume | current iteration and stage, stage progress and ETAs, "updated" time | generated (progress) |
| **T1 merge** | every merge into the shared branch, every publish | the "now" narrative, the current iteration's highlights and lowlights, development status (tasks), blockers, decisions waiting for the owner, decision ledger view, stability (guarded findings, open regressions), KPI cards | generated (ledger, registry, tasks) + hand (now, highlights, owner decisions) |
| **T2 feedback** | customer round finished, triage written, real signal received | customer feedback browser, recommend by persona and iteration, cross-customer patterns, gate status, real signals | generated (sessions, patterns, real signals) + hand (iteration summary) |
| **T3 iteration close** | Gate stage finished (published or not) | the finished iteration's final summary, consumption, estimate accuracy, plan timeline, goal statuses, journal | generated (usage, progress, goals, journal) + hand (final summary) |
| **T4 on change** | the underlying definition changed (panel version, team charters, How we work version, architecture) | personas, team, how we work, architecture | generated where a source exists, otherwise hand, stamped with the source version |

A higher tier includes the lower ones: a T2 refresh also runs T1 and T0.

## Rules for the hand-written fields

- **Now:** at most 5 sentences; first the stage and what is running, then results since the last update, then what comes next and any decision waiting for the owner. Never leave a finished stage described as running.
- **Highlights and lowlights:** at most 5 each, facts with numbers, written at T1 and finalised at T3.
- **Owner decisions:** each one says the question, the options, the recommendation and since when it waits.

## Implementation (kit)

- **Protocol file.** `<instance>/status-protocol.json`: `page` (from the repository root), `tabSelector`, `loopConfig`, `tierEvents` (per tier, the events that make it due: controller event kinds, transitions out of named stages, merges on the shared branch, commits touching paths) and `sections`. A section has `id`, `tier`, `source`, `el` (the page element its stamp line goes under) and one way to produce it: `run` (an external injector such as `progress.mjs`, `{page}` is replaced by the page path), `gen` (a built-in generator: `ledger`, `goals`, `journal`, `stability`, `tasks`, `blockers`, `loop`, `bullets`, `how`, `kpis`), or `derivedFrom` (the page builds it from another section's data). A section may name its own `events` (T4 sections follow the commits of their source). A "generated" section without any of these counts as hand-kept until it gets an injector.
- **Page blocks.** Generated data goes into `/*GEN:START*/ const GEN = {...}; /*GEN:END*/`, keyed by section id, and the page's renderers read it instead of hand copies; stamps go into `/*STAMPS:START*/ const STAMPS = {...}; /*STAMPS:END*/` as `{ id: { t, commit, tier, source, el } }`, and the page shows one discreet "as of" line under each section (hover lists every section's stamp).
- **Hand fields.** The Group Manager writes them in the page, then confirms with `status-refresh.mjs <protocol> --tier T --hand now,iter-current`, which stamps them. A refresh lists every hand section of its tiers whose stamp is older than its tier's last event as owed, and records `status-refresh` (with its tier) with the controller only when nothing is owed, no injector failed and the page check passed.
- **Freshness.** `page-check.mjs <page> --freshness <protocol>` (or `status-refresh.mjs <protocol> --freshness`) fails on a stale stamp; a hand section that was never stamped is listed as owed without failing, so adopting the protocol does not require inventing stamps.
- **Controller.** The loop config's `owes` (`merge` and `publish`: T1, `exit:Use` and `exit:Triage`: T2) marks a refresh owed; the rule `match: "owed"` on `enter:*` blocks the next transition until a refresh of that tier or higher is recorded; `enter:Plan` needs a T3 refresh recorded during Gate (`match: "stage", minTier: "T3"`). `merge.mjs` and `publish.mjs` run the owed tier themselves (generated sections need no one) and print the hand fields still owed.
- **Work packages and blockers.** Tasks come from `runs/iter-NN/work-packages.json` (`[{ id, title, detail, goal, priority, status }]`), blockers from `loop block <id> --what ... --needs ...` / `loop unblock` and from open S1/S2 patterns with a `severity` in the latest `patterns.json`.

## Checks

- `page-check` (script errors on every tab) runs on every refresh.
- `page-check --freshness <status-protocol.json>` compares each section's stamp with the last event of its tier (from the controller's event log and git) and fails on any stale section.
- The controller treats "status refresh owed" as a precondition: after a merge (T1), after Use and Triage (T2), and before the next iteration's Plan (T3).
