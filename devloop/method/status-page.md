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

## Checks

- `page-check` (script errors on every tab) runs on every refresh.
- `page-check --freshness <status-protocol.json>` compares each section's stamp with the last event of its tier (from the controller's event log and git) and fails on any stale section.
- The controller treats "status refresh owed" as a precondition: after a merge (T1), after Use and Triage (T2), and before the next iteration's Plan (T3).
