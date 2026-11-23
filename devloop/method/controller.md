# Loop controller (version 1.0)

Separate orchestration from reasoning. A deterministic controller (`kit/loop.mjs`) enforces the process: which stage the loop is in, which transitions are legal, which gates must have passed on which code, and what is owed after a merge. The AI Group Manager makes the judgments inside it. The controller never decides what is good; it only refuses to move on when a mandatory step is missing, and it records everything it sees.

Why: the slips that hurt a loop run by an AI orchestrator are rarely bad judgment, they are forgotten steps (a rebase in a shared checkout, QA run alongside the customer round instead of before it, a status page not refreshed after a merge, a progress event recorded by hand or not at all). Prose rules are read once and forgotten under load; a rule in the path is checked every time.

## Who decides what

| The controller decides (deterministic, from config and state) | The Group Manager decides (judgment) |
|---|---|
| The current iteration and stage, and which next stages are legal | What the iteration's goals are and in what order work happens |
| Whether a gate result exists for the code being moved (verify, QA, triage, status refresh) | Whether a finding is S1 or S2, a regression or new, worth fixing now |
| Whether a merge, a publish or a stage entry may happen | Design trade-offs, what customer feedback means, when to stop a round |
| That a status refresh is owed after a merge | What the status page and journal say |
| Recording every transition, record, merge, publish and override (events, progress, status page data) | When a rule should be overridden, and why |

## Concepts
- **Stages and transitions.** The stages come from the instance config. Each stage lists its legal next stages (default: the next one). Stages jumped over are logged as skipped; entering the first stage starts a new iteration.
- **Gates** are named checks with a recorded result: `record <gate> --result pass|fail --commit <sha> --evidence <path>`. A pass needs evidence (a summary file, a QA report, the refreshed page). The verify gate records itself when `kit/verify-runner.mjs` finishes a full run on a clean tree.
- **Rules** tie a gate to an action (`enter:<Stage>`, `merge`, `publish`) with a match:
  - `commit`: the record is on that exact commit (a later commit that only changes the controller's own files counts as the same one). For publishing: what the owner plays is what was verified.
  - `code`: the record is on the same code tree, a hash of the files the config calls code. Commits to docs, the ledger or the status page do not invalidate a QA or verify pass; any code change does.
  - `iteration`: a pass exists in the current iteration (triage before Report).
  - `after-merge`: a pass was recorded after the last merge into the shared branch (status refresh).
  The latest record wins: a fail after a pass on the same code blocks again. `accept` lists the results that satisfy a rule (default `pass`).
- **Path conditions.** `"when": { "paths": ["ui/", "data/codex/**"] }` makes a rule apply only when the change touches those paths (an entry without `*` or `?` is a folder prefix, otherwise a glob). For a merge the change is the merge result against the shared branch (exact, from `git merge-tree`); for `loop check <action> --commit <sha>` it is `<base>...<sha>` (what merging it would bring; `--base` defaults to the shared branch). A rule that does not apply is reported as `skip ... not applicable` and never blocks. Use it for gates that only some changes need.
- **Design review** (`design-review` gate). A merge that changes the user interface needs the built screen reviewed in the real app at every breakpoint: the reviewers (UX and art) look at screenshots and the layout audit (`kit/layout-audit.mjs`, `layout-audit.md`) and record `loop record design-review --commit <sha> --result pass|fail --evidence <screenshots dir or layout-audit.json>`. The rule `{ "on": "merge", "gate": "design-review", "match": "code", "when": { "paths": [<UI folders>] } }` enforces it; with `match: "code"` the review stays valid across commits that do not change code (record it on the work branch after merging the shared branch into it, like verify).
- **State** lives in the main worktree (`sharedState`), so agents in their own worktrees record to the same place the merge and publish scripts read. `state.json` is the current state, `events.jsonl` the append-only history. Only the Group Manager commits them, from the shared checkout; work branches never touch the loop folder.

## Enforcement in the path
Rules are only useful where the action happens, so each one has a gatekeeper:
- `kit/merge.mjs <branch>`: merges into the shared branch only when the `merge` rules hold for the merge result (computed with `git merge-tree` before touching anything); refuses dirty tracked files (no autostash) and conflicts (resolve in the work branch, file by file); marks the status refresh as owed.
- `kit/publish.mjs`: fast-forwards the publish branch to the iteration commit, tags it, pushes; refuses without the `publish` rules.
- `kit/hooks/pre-push.mjs` (installed by `kit/install-hooks.mjs`): blocks pushing the publish branch or an iteration tag unless `check publish` passes for the pushed commit.
- `kit/hooks/guard-bash.mjs`: a Claude Code PreToolUse hook that blocks `git pull --rebase`, `--autostash` and multi-path `checkout --theirs/--ours` in the shared checkout (installation: `kit/hooks/README.md`).
- `loop advance` / `loop start`: refuse a stage whose entry rules fail. Entering Gate reads the latest quality scorecard (`quality-gate` rule on the `quality` gate, recorded by `kit/evaluate.mjs --record`, `quality.md`): gate met on the code being released, or an override with a reason.
- `loop check <action>`: the same answer for any other script or hook (exit 1 with the reasons).

## The override path
The controller must never block a legitimate owner or Group Manager call. `loop override <rule> --reason "..."` lets one rule pass for a limited time (`--ttl`, default 60 minutes). Rules are the config's rule ids, `transition:<From>-><To>` for an unlisted transition, and `guard:<name>` for the bash guard. Every override:
1. needs a reason (refused without one),
2. is appended to `events.jsonl`, and each use is logged as `override-used`,
3. appends a draft row to the instance decision ledger, which the Group Manager completes (or supersedes) before the next Report.

An override that recurs is a signal that the rule or the config is wrong: change the config through a ledger entry rather than overriding every iteration.

## Status refreshes owed
A merge or a publish owes a T1 status refresh, the end of Use or Triage a T2 (config `owes`); the rule `match: "owed"` on `enter:*` blocks every transition until `kit/status-refresh.mjs` records a refresh of that tier or higher, which it does only when the generated sections are refreshed and the hand-written ones are confirmed. Leaving Gate needs a T3 refresh during Gate (`match: "stage"`, `minTier`). See `status-page.md`. `loop block <id>` / `loop unblock <id>` keep the blockers the status page shows.

## Progress and the status page
Every transition calls `kit/progress.mjs` (start, skip, end of the old iteration) and, when configured, injects the progress data into the status page, so stage times and ETAs no longer depend on someone remembering. `loop progress --total N` / `--done N --note "..."` passes unit events through the same path. `--done N` ADDS N finished units (calling it twice counts twice); `--done-set N` sets the count for corrections. Entering the first stage of a new iteration, and publishing, end every stage still open in earlier iterations (`progress.mjs --end-all`), and the status page focuses the newest iteration with an open stage, so a forgotten end can no longer pin the page to an old iteration. A failed pass-through prints the child process error.

## Adopting it in an instance
1. Copy `templates/loop-config.json` to `instances/<product>/loop/config.json`; set the stages, transitions, gates, rules, code paths, branches and the progress page.
2. `node devloop/kit/loop.mjs init --iteration N --stage S [--since ISO]` (or write `state.json` by hand once).
3. `node devloop/kit/install-hooks.mjs` and the Claude Code hook from `kit/hooks/README.md`.
4. From then on: `loop status` at the start of every orchestration turn, `loop advance` for stage changes, `merge.mjs` and `publish.mjs` instead of manual git, `loop record` for QA, triage and status refresh.
