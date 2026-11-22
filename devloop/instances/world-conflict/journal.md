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
