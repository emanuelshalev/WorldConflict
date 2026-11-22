# Triage protocol (version 1.0)

Sits between the panel and the backlog. Output: `synthetic/runs/iter-NN/triage.md` and `findings.json`.

1. **Collect** every friction, bug and suggestion from the session reports.
2. **Deduplicate and cluster** by cause, not by symptom. A cluster gets an id `F-NN-k` (iteration, index).
3. **Reproduce bugs.** QA re-runs the reported steps on the same build. Only reproduced bugs are filed; the verified-bug rate is tracked.
4. **Weigh.** Cluster weight = sum of panel weights of the personas who hit it. Real signals (RS-*) count as automatic priority.
5. **Decide** using thresholds set in advance:
   - **Fix now** if severity S1/S2, or weight >= 0.30, or it maps to a CEO goal.
   - **Propose adding** a capability when a weighted share >= 0.30 fails at the same goal for the same reason across at least two archetypes and two consecutive builds (one build if it matches a real signal).
   - **Rework** when completion is acceptable but one archetype's time or retries are far worse.
   - **Never remove** a feature (CEO rule). Low-use features are surfaced better or made optional instead.
6. **Ledger.** Every decision that changes the product gets an entry in `../ledger.md`.

## Release gate (RC)
- Every CEO goal (G1 to G7 in `../goals.md`) verified by QA and confirmed by the panel.
- No open S1 or S2 finding.
- Weighted recommend >= 7.0, no persona below 6; weighted feels-like-a-game >= 7.0 and agency >= 7.0.
- Olivia (early quitter) completes a first session without quitting.
- Tests, lints and build green; balance harness inside the bands in CLAUDE.md.
