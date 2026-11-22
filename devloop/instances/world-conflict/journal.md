# Journal: how we work, and what we learn

Newest entries at the bottom. Each entry names an area for improvement in our process and the change made to "How we work" (`HOW_WE_WORK.md` and the status page tab).

## 2026-11-21 · Iteration 0 · Setup

- **Observation.** The previous three persona rounds rated visuals 7/10 and recommend 5-6, yet the CEO, our first real customer, found the UI dashboard-like, blocking and unclear. The panel was too patient, read too carefully and had no skeptic or quitter: exactly the bias the research predicts (synthetic respondents are more positive and less varied).
- **Change.** Added two negative personas, lowered patience and reading globally, made customers run on a different model and blind to design intent, and raised the release gate. Made the CEO's statement about the credit bar a hold-out check: the corrected panel has to find it on the old build without being told.
- **Change.** Spec before code: every UI goal now starts with an Art Director concept and a UX interaction spec, because earlier UI changes were engineered directly and drifted toward generic components.

## 2026-11-21 · Iteration 0 · CEO course corrections

- **Observation.** The loop lived in `synthetic/` mixed with game files, and the method docs referred to World Conflict throughout. The CEO wants the methods, setups and learnings reusable elsewhere.
- **Change.** Split into `devloop/` (method, kit, templates, HOW_WE_WORK, LEARNINGS) and `devloop/instances/world-conflict/` (panel, team, goals, ledger, journal, runs). The kit takes a device key instead of persona names. (D-41)
- **Observation.** The panel was mostly gamers. The CEO's audience is wider: teens, people with little gaming experience, older readers of current affairs who want to learn and test real events, in quick or long sessions.
- **Change.** Coverage matrix first, then three new archetypes (Ruth, Noah, Marcus); nine archetypes in total; a second must-complete persona (Ruth) in the gate; new goals G8 (wide audience) and G9 (learn and test real history). (D-40)
- **Observation.** Only product quality had goals.
- **Change.** Added track B goals (P1 to P6) for agentic development practice, measured each iteration, with cross-project lessons in `devloop/LEARNINGS.md`. (D-42)

## 2026-11-22 · Iteration 0 · Baseline round

- **Observation.** Nine browser sessions at once pushed the load average to 110-137 on 20 cores; 6 of 9 sessions froze and the evidence about performance became ambiguous. **Change.** At most 4 browser sessions at once per machine (D-44); QA reproduces any freeze alone before it is filed.
- **Observation.** Customers shared one scratch folder; one overwrote another's helper script and commands hit the wrong browser. **Change.** Each customer gets its own scratch folder and port, named in its brief.
- **Observation.** A restarted driver lost the game (new guest id) and overwrote screenshots; phone screenshots were at 2x, so tap coordinates were off by half. **Change.** Kit: persistent browser profile per persona, screenshot numbering continues, screenshots at CSS scale.
- **Observation.** Nobody reached the end of a game, and the CEO's next signal (RS-002) was about exactly that. **Change.** Every iteration at least 3 personas must reach an end screen, and the end has its own scenario.
- **Observation.** The recalibrated panel predicted 6 of 7 RS-001 statements without being told (fidelity 6/7). Calibration worked.
- **Observation.** Design started while QA reproduced bugs, in parallel: four design workstreams (orders, month, feel, reveal) from one shared brief. Writing a shared brief file kept each agent prompt short and consistent.

## 2026-11-22 · Iteration 1 · QA reproduction

- **Observation.** The kit itself produced false findings: it clicked only `role=button` elements (tabs and list options looked dead), silently dismissed native confirm dialogs (an order "never queued"), and rendered in software GL, which starved the CPU and caused most freezes. 8 of 10 reported bugs were real; 2 were the kit's fault. **Change.** Kit clicks every pressable role, shows dialogs to the persona and logs them, uses GPU rendering by default. QA reproduction stays mandatory before any bug is filed.
- **Observation.** A glossary rename broke the smoke script's navigation ("Home and security" became "Home front"). **Change.** Smoke follows forward buttons structurally, not by page names, and fails loudly when stuck.

## 2026-11-22 · Iteration 1 · Consumption tracking (CEO request)

- **Observation.** We had no view of where the AI work (tokens) goes. The transcripts already record exact usage per response. **Change.** `kit/usage-ledger.mjs` attributes every response to role, persona, stage, iteration and time via a registry; the status page has a Consumption tab. Agent descriptions now follow naming rules so attribution is automatic, and the orchestrator records stage boundaries in the registry.
- **First readings.** Since the loop started: 34M weighted tokens, 98% of input served from cache. Engineers are the largest share (build), then orchestration (about 20%), customers and designers. A customer session costs about 0.6M weighted, a design spec about 0.9M, a build package about 2.2M.

## 2026-11-22 · Iteration 1 · Customer round and triage

- **Result.** Weighted recommend 4.9 to 6.2; quits 7 of 9 to 1 of 9; "blocked" frictions nearly gone. The CEO's blocking, vocabulary and parity points are confirmed fixed by the panel; trust (contradicting numbers and endings) and density are the new bottlenecks.
- **Observation.** Running customers in two waves of 4 to 5 browsers with GPU rendering produced clean sessions with no freezes. **Kept.**
- **Observation.** Two content agents writing to one codex in parallel duplicated three entries, claimed one alias twice and each left Ukraine to the other. Combining their branches in a scratch worktree and running the consistency check before merging caught all of it. **Change.** Parallel content work always gets a combine-and-check step before merge; briefs name shared entities and their single owner.
- **Observation.** A usage limit paused the work mid-round. Agents resumed with their context via messages, and the customer round restarted from its brief. **Change.** Keep briefs as files so any stage can restart cold.
- **Observation.** After merging the full codex, the shared dev server still served the 15 seed entries (per-process cache), so the new "What is going on here?" briefings silently did not render in review. **Change.** Restart the shared dev servers after any data merge and before a customer round; check one API payload as part of the pre-panel checklist (B-21 tracks a dev-mode cache invalidation).
- **Observation.** The CEO saw the status page stuck on "Plan" while three build packages had already merged: I updated the page at stage starts but not after each merge. **Change.** The status page (stage, now-box, iteration log) is regenerated after every merge, not only at stage boundaries.

## 2026-11-23 · Iteration 2 · Customer round, wave 1

- **Observation.** The concept test showed 6 of 9 customers rejecting an auto-opening briefing. I kept it on for the "Guide me" level as a segment exception (D-53), untested. In wave 1, the two personas who chose "Guide me" (Olivia, Noah) both hit it as their quit point, and their scores fell from 6 to 5, while Maya rose to 8. **Change.** A majority objection in a concept test is not overridden by a segment exception unless that exception is tested with the segment first; when in doubt, ship the opt-in variant.
- **Observation (my error).** Resolving 63 conflicted benchmark files with one multi-path `git checkout --theirs` aborted on a deleted file, resolved nothing, and I committed the markers; the shared server then served broken benchmarks during wave 1 (no rarity, no ranking ladder in the reveal). QA caught it before push. **Change.** A repository test now fails on any conflict marker; generated files are resolved per file or regenerated, and every merge is followed by the full test run before the server is used for a customer round (D-57).
- **Observation.** A rule that made non-existent states unplayable also removed the West Bank seat in 2025 and 2026 and 1960 Nigeria, a lost capability. **Change.** Restore the seats; keep accuracy by default with an explicit "What if" option for alternate-history seats (D-56).

## 2026-11-23 · Iteration 3 · CEO asks whether the degradation is real

- **Observation.** Per-persona score moves between iterations (plus or minus 1) were within the panel's noise: one session each, with crisis, seed and device all rotating, and a broken reveal in iteration 2. The real signal was behavioural: two personas independently hit the same quit point with the same cause. **Change.** A fixed control scenario per persona every iteration plus one rotating scenario; 1-point moves are noise unless backed by behaviour (D-59).
- **Observation.** Regression checks beyond the unit tests (smoke, acceptance scripts, balance bands, visuals) ran only when an agent remembered, and scripts drifted from the UI. **Change.** One `npm run verify` gate, including visual regression and balance bands, before every merge and every customer round (D-59).
- **CEO direction.** "Fixed stays fixed" is a product stabilisation goal (G13) and part of how we work: How we work v1.4 adds principles 12 (fixed stays fixed: registry guard per finding, one verify gate before merges and panel rounds, regressions first in triage) and 13 (compare like with like).

## 2026-11-23 · Iteration 3 · First full verify gate run

- **Observation.** The first full gate run on the integrated iteration-3 build passed unit tests, lints, build, smoke, reveal and balance, but failed 7 of 82 finding guards and 6 of 20 visual baselines. Without the gate these would have reached the panel and the CEO. Some are expected to be true cross-fix regressions (for example collapsing Map-mode advisors to fit the globe versus the earlier "advisors readable in Map mode" fix), some guards written before an intended change. **Change.** Each failure is classified (regression / guard outdated / guard bug) and resolved without weakening any guard; a guard is updated only for a documented intended change, with the decision id recorded in the registry.
