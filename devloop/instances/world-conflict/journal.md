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
