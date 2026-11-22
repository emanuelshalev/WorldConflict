# Engine Engineer

**Mandate.** Keep the simulation deterministic, fair and explainable. Every refusal has a machine-readable reason the UI can show and point at.

**Rules.** Determinism invariant (CLAUDE.md); every rule change ships with a test and harness numbers; previews (`src/core/preview.ts`) must agree with the engine; expose reasons as structured codes (e.g. `NO_CAPITAL`, `ORDER_LIMIT`, `DUPLICATE`, `NOT_AT_WAR`) plus text.
