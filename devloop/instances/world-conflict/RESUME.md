# Resume point (updated 2026-11-23 after a session restart)

Read this first when picking the work back up. Then run `node devloop/kit/loop.mjs status` (the controller knows the stage and which gates hold on the current code).

## Where things stand
- **main** = tag `iter-3` (06f937b), published after a green gate. Tags `iter-1`, `iter-2` exist.
- **dev/rc1-synthetic-loop**: iteration 4, stage Plan. Merged since iter-3: loop controller and hooks (D-77), status page protocol (method/status-page.md), quality scorecard (D-78, D-79), WC_DAILY_DATE pin for gate servers, ultrawide 3440x1440 in the kit (the CEO's screen, RS-008).
- Hooks installed locally: `.claude/settings.json` (guard-bash: no rebase/autostash/multi-path checkout in the shared checkout) and `.git/hooks/pre-push` (no unverified push to main or iter-* tags).

## In-flight work (worktrees under .claude/worktrees/)
| Worktree / branch | Task | State |
|---|---|---|
| agent-abc8bd2f32a8828e0 (build-layout-audit) | Layout audit kit, RS-008 guard (status: open), path-conditional rules and design-review gate | Built; shared branch merged in (d06e458); full verify running there; then `node devloop/kit/merge.mjs` and add the design-review-before-merge rule to loop/config.json |
| agent-a55788049b2448915 (stability-iter4) | D-76 stability package from runs/iter-03/qa-repro.md | 3 commits (advisers, engine, UI), registry uncommitted; resumed |
| agent-a7007dcf0d9127beb (design-layout-rs008) | Responsive layout system (D-80, D-81), 3440x1440 primary | Mocks in progress, design-layout.md not written; resumed |

## Next steps, in order
1. Merge the layout audit (after its verify records a pass), add the design-review rule.
2. Merge the stability package after its verify; Game Designer decision on runs/iter-04/accept-all-balance.md.
3. Layout design review (UX, Art Director, Game Designer sign-off), then build the guided agenda and order cards in the new layout (design-agenda.md, design-order-cards.md, design-layout.md).
4. Design pass and play pass, QA, then the iteration 4 customer round (QA before customers; Dan plays at 3440x1440), triage, scorecard, publish iter-4.

## Useful facts
- Status page: `node devloop/kit/status-refresh.mjs devloop/instances/world-conflict/status-protocol.json --tier T1|T2|T3 [--hand now,iter-current,iter-summary]`.
- Never commit in the shared checkout while a full verify runs there (the runner refuses to record when HEAD moves). `setup.cmd` is a CRLF artifact: `git update-index --assume-unchanged setup.cmd` in each worktree before a verify.
- Rules: never remove a capability; no em dashes; conventional commits with the Co-Authored-By and Claude-Session trailer; customers on Sonnet, builders and designers on Opus; at most 4 to 5 browser personas at once; restart dev servers after merges (`npm run dev`, Node 22 at ~/.local/share/node/current/bin).
