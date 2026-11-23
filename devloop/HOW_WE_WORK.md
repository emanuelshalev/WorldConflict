# How we work (current state)

Version 1.7, 2026-11-23. Changed only through journal entries (`instances/*/journal.md`) and mirrored on the instance status page.

## Principles
1. **Customers decide, builders build.** Synthetic customers run in fresh sessions, blind to design intent and the goal list, on a different model from the builders where possible.
2. **Real signals win.** Owner and real-user feedback calibrates the panel; when they disagree, go with the real person.
3. **Spec before code** for anything user-facing: designer concept and interaction spec with acceptance criteria first.
4. **Every change is traceable**: ledger entry with evidence, alternatives, expected effect and a reversal condition.
5. **Never remove a capability** without an owner decision; improve, surface or make optional.
6. **Parallel by default, isolated when touching shared files**: independent workstreams run as parallel agents with narrow briefs; overlapping edits use separate worktrees or are sequenced.
7. **Verify before the panel sees it**: tests, lints, build, domain harnesses, smoke playtest through the real UI.
8. **Isolate agents and respect capacity**: each agent has its own port, scratch and output folder; at most about 1 browser persona per 5 CPU cores at once.
9. **Check reports like code**: run `kit/page-check.mjs` on any status page before committing it.
10. **Reach the end**: each usage round, at least 3 personas reach an end screen.
11. **Measure consumption**: every agent gets a description its usage rule can match; the orchestrator logs stage boundaries in the usage registry; consumption is regenerated with each status update.
12. **Fixed stays fixed.** Every addressed finding gets an automated guard in the regression registry before it is marked fixed. One command (`verify`) runs all tests, lints, build, UI smoke, visual regression, balance bands and every guard; it must pass before any merge and any panel round. New feedback is checked against the registry first; a regressed finding is at least S2 and is fixed before new work.
13. **Docs follow the code.** A work package is done only when the docs it changes (player guide, API, architecture, agent guidance) say what the code now does.
14. **Compare like with like.** Each persona replays a fixed control scenario every iteration plus one rotating scenario; single-score moves of one point are noise unless behaviour backs them.
15. **Report often**: the status page and journal are updated at each stage and after every merge, so the owner can follow without asking.
16. **Orchestration is code, judgment is ours.** A deterministic controller (`kit/loop.mjs`, `method/controller.md`) owns stage transitions, mandatory gates (verify on the exact commit before merge and publish, QA before the customer round, status refresh after a merge) and the record of every transition; the Group Manager owns priorities, severity, trade-offs and what feedback means. Merges and publishes go through `kit/merge.mjs` and `kit/publish.mjs`, hooks block the dangerous git commands in the shared checkout, and a rule is skipped only with `loop override <rule> --reason`, which drafts a ledger row.
17. **Estimate and learn**: record every stage transition (and units of work done) with `kit/progress.mjs` (the controller does it on every `loop advance`), so the status page shows progress and ETAs from our own history; review estimate accuracy at each Report stage and adjust the method when a stage stays off.
18. **The gate is measured, noise included.** Each instance declares its release gate as metrics in `quality.json` (source, threshold, noise band, cadence, blocking or informative, veto); `kit/evaluate.mjs` scores them from existing outputs (method/quality.md). Inside the noise band a metric is neither pass nor fail; a stale or missing measurement is "not measured", never a pass; open real signals at S2 or worse veto the gate. The Gate stage reads the recorded verdict, and the status page shows the scorecard and its trend per dimension.
19. **Use the screen, hide nothing.** A change to a screen's layout runs the layout audit (`kit/layout-audit.mjs`, `method/layout-audit.md`) at every viewport from phone to the largest monitor, the owner's own screen first: no inner scrolling or content below the fold for what the player must see or act on at laptop size or larger, the width used on wide screens, small screens collapse visibly (a summary with a count). Its report and screenshots are the evidence for the `design-review` gate that merges touching the UI need.

## Iteration
| Stage | Who | Output |
|---|---|---|
| 1. Plan | Group Manager | 3 to 5 goals for the iteration, each tied to findings and gate criteria |
| 2. Design | Designer, UX, Art Director | Specs, concepts, acceptance criteria (`runs/iter-NN/design-*.md`) |
| 3. Build | Engineers (parallel agents) | Code, tests, ledger entries |
| 4. Verify | QA | `verify` gate green: tests, lints, build, smoke, visual regression, balance bands, every regression guard |
| 5. Use | Customer panel (blind, parallel) | Schema-valid session reports with screenshots |
| 6. Triage | Group Manager + QA | Regression check against the registry first, then clusters, reproduced bugs, decisions; every fix adds a guard |
| 7. Report | Group Manager | Status page, journal; after a green verify gate, fast-forward `main` to the finished iteration and tag it `iter-N` so the owner can playtest it from `main` |
| 8. Gate | Group Manager | Quality scorecard recorded (`kit/evaluate.mjs --record`). Pass: release candidate tag. Fail: next iteration |

Iteration 0 is special: interviews and a baseline usage round on the current build, before any building, so the first goals come from evidence.

- **The status page follows a protocol, not memory.** Every section has a tier (live, merge, feedback, iteration close, on change) triggered by loop events; generated sections are injected from their source files, only judgement is hand-written, every section carries an as-of stamp and the page check fails on a stale one (method/status-page.md).

- **Design leads user-facing work.** Interface and gameplay decide whether features shine. Every user-facing change starts from a designer's spec and mocks at every screen size, co-signed by the visual and gameplay leads, and merges only after a design review of the real built screen (recorded with the controller). Each integrated build gets a design pass and a play pass before customers see it; their findings block like QA findings.

- **Spend where judgement is.** Model per task: the strongest model for design, game design, engine and balance work and orchestration; a cheaper capable model for mechanical, well-specified work (guards, kit tools, reproductions, gate fixes), kept only while its first-pass gate rate and rework hold. No idle agents: builders run the changed-files gate and hand back; the controller runs one full gate at a time. Keep long-lived contexts lean (compaction around 400k, on-demand docs instead of a long CLAUDE.md). Measure cost per completed work package, at real per-model prices.

## Quality per token: Anthropic guidance and our approach

Goal: the best product quality for the tokens spent, measured as cost per completed work package, never per request. Quality comes first: a cheaper run that needs rework or ships a regression is not cheaper.

### What the guidance says (sources checked 2026-11-23)

| Topic | Guidance | Source |
|---|---|---|
| Model per task | Sonnet handles most coding tasks well and costs less than Opus; reserve Opus for complex architectural decisions or multi-step reasoning; Haiku for simple subagent tasks; Sonnet for agent-team teammates | Claude Code docs: Manage costs, Model configuration, Subagents |
| Setting it | Subagent model precedence: per-call `model` parameter, then the agent definition's `model`, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the parent's model; per-subagent `effort` is available | Claude Code docs: Subagents |
| Order of levers | Free wins first (caching, input hygiene, loop hygiene, output hygiene, batch), then trade-offs (effort, budgets), model choice last; change one lever at a time and judge on cost per completed task, repeating trials before keeping or reverting | Claude API cost optimization guide |
| Prompt caching | Automatic in Claude Code; reads are a small fraction of the input price; a 5-minute write costs 1.25x input, a 1-hour write 2x; subagents default to 5 minutes; the 1-hour lifetime pays only through the misses it prevents; a request after a pause longer than the lifetime is a full miss | Claude Code docs: Prompt caching; API pricing |
| What breaks the cache | Switching models or effort mid-session (effort is kept on the newest models), toggling fast mode, connecting MCP servers when tools load upfront, denying a whole tool, compaction (once, by design) | Claude Code docs: Prompt caching |
| Context | Long context is resent on every request: clear between unrelated tasks, compact proactively (the default trigger on 1M-context models is near the limit), keep CLAUDE.md under about 200 lines and move workflow detail to skills or docs loaded on demand, let subagents absorb bulky output and return a summary | Claude Code docs: Manage costs, Context window, Model configuration |
| Effort and thinking | Lower effort is faster and cheaper for straightforward tasks; thinking is billed as output; `max` shows diminishing returns | Claude Code docs: Model configuration |
| Fast mode | Same model, lower latency, about 2x price; enabling it mid-conversation reprices the whole context | Claude Code docs: Fast mode |
| Waiting | Background subagents report by notification; polling resends the full context on every check | Claude Code docs: Subagents, Manage costs |

### Our approach

1. **Measure first, at real prices.** The usage ledger (`kit/usage-ledger.mjs`) prices every request per model and token type, classifies every agent, and reports cost per completed work package; an unclassified agent is a measurement bug.
2. **Strongest model where judgement decides quality:** design, game design, engine and balance work, orchestration and triage decisions. **A cheaper capable model for mechanical, well-specified work** (guards, kit tools, reproductions, gate fixes, doc refactors), kept per package type only while its first-pass gate rate and rework hold against the stronger model. Customer personas and scorers run on the cheaper model; the panel's fidelity is checked against real signals.
3. **No idle agents.** An agent that waits past the cache lifetime pays to rewrite its whole context. Builders run the changed-files gate and hand back; the controller runs one full gate at a time (parallel full gates also starve browser steps). Long-running work reports by notification, never by polling.
4. **Lean long-lived contexts.** The orchestrator compacts around 400k tokens; continuity lives in files (resume note, ledger, controller state, journal), not in the conversation. Briefs point agents at the files to read instead of pasting them; reports come back as summaries.
5. **Short always-loaded instructions.** The project instruction file holds only what every task needs; detail lives in docs read on demand.
6. **Stable prefixes.** One model and one effort per agent for its whole run; no fast mode; tool and MCP sets fixed per session.
7. **Spend tokens on evidence, not repetition.** Synthetic tests are noisy per item: replicate and aggregate instead of rerunning single rounds, and stop test rounds when returns diminish (validate in real use instead).
8. **Review the numbers every iteration.** The Consumption tab shows cost by stage, role, model, persona and work package; the journal records which strategy changed and what it did to cost and quality.

