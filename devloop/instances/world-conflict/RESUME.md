# Resume point (paused 2026-11-23 for a machine shutdown)

Read this first when picking the work back up. Everything below is committed and pushed.

## Where things stand
- **main** = tag `iter-2` (67c9b11): the CEO playtests from here. Tag `iter-1` also exists.
- **dev/rc1-synthetic-loop** = iteration 3 integrated: seats and replay, newcomers first, outcome truth, verify gate and regression registry (82 findings), docs refresh, RS-004 exit fix. Unit tests, lints, build, smoke, reveal and balance pass.
- **Iteration 3, stage 4 (Verify).** The first full `npm run verify` failed 7 finding guards (RS-001-2, RS-001-5, QA0-5, QA1-S2-1, QA1-S3-3, QA2-AC3, RS-004) and 6 visual baselines (expected after UI changes). Iteration 3 does not wait for the redesigns (CEO: "do not hold it3").

## In-flight work (paused mid-task; branches pushed, marked wip)
| Branch | Task | Brief | State when paused |
|---|---|---|---|
| `gate-fixes` | Classify and fix the 7 failing guards and 6 visual diffs (regression / guard outdated / guard bug; never weaken a guard) | prompt summary in journal 2026-11-23 "First full verify gate run"; rules in devloop/method/triage.md steps 7-8 | Guard scripts QA1-S2-1, RS-001-2, RS-004 and CommandRail/OrderCard/ease.css/orders.css edited; was starting on the visual diffs |
| `fix-staff-picks` | RS-005: titled "Staff picks" group next to every Approve control (desk, phone, Map mode), button names the count, first-use explanation, guard RS-005.mjs | runs/iter-03/FIX_BRIEF.md + RS-005 + D-64 | StaffPicks.tsx, useStaffPicks.ts, staff-picks.css, RS-005.mjs written; CommandRail/glossary/month.ts edited; not finished or tested |
| (dev branch, runs/iter-03/concepts) | RS-006 agenda design (D-65): month as a guided agenda | ask in ledger D-65; real-signals/RS-006 | Concept HTML/PNGs for variants A/B, map, skip, affordance; design-agenda.md and agenda-concept-test.md not yet written |
| (dev branch, runs/iter-03/concepts) | RS-007 order-card design (D-66): pictograms per order type, family colours, recognition test | ledger D-66; real-signals/RS-007 | Scene thumbnails captured; icon generator and design-order-cards.md not yet written |

## Next steps, in order
1. Restart the dev servers: `export PATH=$HOME/.local/share/node/current/bin:$PATH && npm run dev` (Node 22 at that path; aarch64).
2. Finish `gate-fixes` (merge origin dev into it first), run `npm run verify` until green, merge.
3. Finish `fix-staff-picks` (merge origin dev first), `npm run verify -- --changed`, then full verify, merge.
4. Restart the shared servers, QA verification, then the iteration-3 customer round (brief: copy runs/iter-02/CUSTOMER_BRIEF.md to runs/iter-03 with the new rules: fixed control scenario per persona (D-59), at least two months in Map mode, start a second game from the end screen (RS-004), state the month's to-do list and report affordance problems (RS-006), knowledge flags). Two waves of 4-5, Sonnet, ports 7841-7849.
5. Triage (regressions first, D-60), then publish: fast-forward `main` to the finished iteration and tag `iter-3` (D-62), after a green verify gate.
6. Iteration 4: finish the agenda (RS-006) and order-card (RS-007) designs, concept-test both with the panel (the order icons need 80%+ recognition), then build.

## Useful facts
- Status page: dev_plan/project_status.html (LOOP object; regenerate usage with `node devloop/kit/usage-ledger.mjs devloop/instances/world-conflict/usage/registry.json --inject dev_plan/project_status.html USAGE`, feedback with `node devloop/kit/feedback-digest.mjs devloop/instances/world-conflict <n> --inject dev_plan/project_status.html FEEDBACK`, check with `node devloop/kit/page-check.mjs dev_plan/project_status.html`).
- Real signals RS-001..RS-007 in real-signals/; ledger up to D-67; journal and How we work v1.4 current.
- Rules: never remove a capability; no em dashes; conventional commits with the Co-Authored-By and Claude-Session trailer; customers on Sonnet, builders on Opus; at most about 4-5 browser personas at once; restart servers after data merges.
