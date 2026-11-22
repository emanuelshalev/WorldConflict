# World Conflict release gate (RC)

Thresholds on top of the method template (`../../method/triage.md`). Raised by D-39 after RS-001.

- Every game goal G1 to G10 (`goals.md`) verified by QA and confirmed by the panel.
- No open S1 or S2 finding.
- Weighted recommend >= 7.0, no persona below 6.
- Weighted feels-like-a-game >= 7.0 and agency >= 7.0.
- The early quitter (Olivia) and the low-gaming-experience news follower (Ruth) complete a first session without quitting.
- `npm test`, `npm run lint`, `cd ui && npm run lint`, `npm run build` green; balance harness inside the CLAUDE.md bands; `node devloop/instances/world-conflict/smoke.mjs` passes.
