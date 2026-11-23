# Resume point (handover to another machine, 2026-11-23)

Read this first. Setting up a new machine: `handover/README.md` (Node 22, `npm run setup`, git hooks, Claude settings, memory notes). Then run `node devloop/kit/loop.mjs status`; the controller knows the stage and which gates hold on the current code.

## Where things stand
- **main** = tag `iter-3` (06f937b). Tags `iter-1`, `iter-2`, `iter-3`.
- **dev/rc1-synthetic-loop**: iteration 4, stage **Build** (progress 5 of 12 weighted units). Merged in iteration 4: loop controller and hooks (D-77), status page protocol, quality scorecard (D-78, D-79), usage ledger at real prices with API-equivalent cost per iteration (D-82, D-83), layout audit with the design-review merge rule (D-80, D-81), the responsive layout design, CLAUDE.md trim (details in docs/ARCHITECTURE.md), WC_DAILY_DATE pin for gate servers, ultrawide 3440x1440 in the kit (the CEO's screen).
- Decisions this iteration: D-72 to D-84 in `ledger.md` (wording "Recommended", icons, cost package, models, design leads, layout system, "Your call" with an opt-in Chief of Staff setting).

## Work branches (all pushed to origin, none merged yet)
| Branch | What | State | Next |
|---|---|---|---|
| `stability-iter4` (980b113) | D-76 stability package: 1 regression, 16 guard gaps, 6 new (Map mode kept, ceasefire refusal memory, island taps, UN board, labels), then the 2 S2s from design review fixed (rail rows on short screens, top bar folds into Menu below 1600) with the F-00-4 guard at 1366x768 and more | Full verify PASS on 980b113; design re-review APPROVED WITH CONDITIONS, recorded as design-review pass on 2839d9b (condition, S3: on short desktop rails the 56 px rail body slices the political capital seal row; size it to the heading or heading plus seals; tracked under WP-L1 in the layout build) | The shared branch gained code since (layout audit bundle), so: merge dev/rc1-synthetic-loop into stability-iter4, full verify, then `node devloop/kit/merge.mjs stability-iter4` (the review is recorded on the code tree; re-record it if the controller asks, citing the same review) |
| `build-order-cards` (1ac8a6c) | RS-007 order cards: 28 icons ported, family colours, lighter cards, one OrderCard, danger orders confirm (11), order log for real-use validation, contrast guards | Built; `verify --changed` passed. 4 visual baselines need updating (new images were in a temporary folder: regenerate with `npm run verify -- --update-visual` after merging the stability branch into it) | Merge stability-iter4 into it, update baselines, full verify, design review, merge |
| `build-agenda-layout` (d5cbbf4, wip) | The new month screen: layout frame (no inner scroll, full width), StateBand replacing the HUD, guided agenda (Choose, Skip card, month bar), Map mode layout, "Your call" UI, D-73 wording ("Choose all recommended"); RS-008 guard now normal and passing at every size, 3440x1440 first; RS-008-1 new | WIP: visual baselines half-regenerated (run `npm run verify -- --update-visual`), rerun `VERIFY_BASE=stability-iter4 npm run verify -- --changed`. Deferred: order catalogue family tabs, details grid beside the result at W/U, paper pagination, reveal stages split. Reconcile its `advice.calls` type with build-your-call's payload at merge. Preview shots: `runs/iter-04/build-preview/` (seen: a coach tip covers the question heading at 3440; a raw goal label "approval 56%+") | Finish, merge build-order-cards and build-your-call into it, full verify, design review, merge |
| `build-your-call` (ec13051, wip) | D-84 engine and balance: calls classification, two advisers, PUSH_PC 1, upkeep staff orders, harness policies (staff, chief, guided, callpush, callhold), bands, quality metrics, setting `chiefCalls` | WIP: run `npm run bench:reveal`, register D84-* guards, rerun the 36-game harness, lint, `verify --changed`/`--quick`, delete `.scratch/`, update CLAUDE.md balance text (CEO approval for CLAUDE.md edits comes through the Group Manager). Real harness: staff 17-18% (band <= 30), guided 82% (65-90), cap months 33% (<= 45), smart 74%. **Missed band: callpush vs callhold gap about 12 points (band 8)**, half from water-war India; Quarantine China wins 89-92% with calls skipped (needs one objective that requires a move) | Game Designer (Fable 5.2 per D-83) decides on the gap and the QU-CHN objective, then finish and merge |
| `fix-loop-progress` (d5fd2b1) | Controller closes the previous iteration's stages, newest-iteration focus, real error output, --done-set | Built, tests pass | Merge with the next full gate |

## Next steps, in order
1. Stability: merge the shared branch into it, full verify, merge (review already passed).
2. Order cards: baselines, gate, design review, merge.
3. Your call: Game Designer decision on the missed band and QU-CHN, finish, merge.
4. Agenda layout: finish, merge the others in, gate, design review (3440x1440 first), merge. Then the design pass and play pass (Game Designer counts real decisions per month; D-84 target at least one in 80% of months 2 to 12).
5. QA (before customers), customer round (Dan at 3440x1440 ultrawide; control seeds in scenarios/scenarios.yaml), triage, scorecard (`npm run quality -- --iteration 4 --record`), publish iter-4 with `node devloop/kit/publish.mjs` after a green verify on the exact commit, update the CEO.
6. Iteration 5: Group Manager trial on Fable 5.2 in a fresh session (D-83), compared on decision quality and cost.

## Parked ideas (not scheduled; CEO said wait)
- Status portal over structured data: per-section JSON written by tools, short markdown for hand fields, a generic kit viewer and a build step bundling one HTML. Discussed 2026-11-23; do not start until the CEO asks.

## Useful facts
- Gate queue: one full verify at a time per machine (D-82); builders run `verify --changed` and hand back; the Group Manager runs full gates and merges with `node devloop/kit/merge.mjs <branch>` (needs verify on the merge result, and a recorded design review for UI changes). Never commit in a checkout while a full verify runs there.
- Status page: `node devloop/kit/status-refresh.mjs devloop/instances/world-conflict/status-protocol.json --tier T1|T2|T3 [--hand now,iter-current,iter-summary]` (protocol: devloop/method/status-page.md). The CEO watches it: refresh after every merge and stage change.
- Models (D-83): Group Manager and engineers Opus 5.5; designers Opus; Fable 5.2 for hard decisions; QA Sonnet for scripted checks, Opus for root-cause; customers, scorers Sonnet; Sonnet trial for mechanical packages (D-82).
- `setup.cmd` is a CRLF artifact: `git update-index --assume-unchanged setup.cmd` in every checkout and worktree before a verify.
- Rules: never remove a capability; no em dashes; conventional commits with the Co-Authored-By and Claude-Session trailer; at most 4 to 5 browser personas at once; restart dev servers after merges.
