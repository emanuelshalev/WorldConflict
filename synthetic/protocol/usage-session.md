# Usage session protocol (fixed, version 1.0)

The strongest signal in the loop. A persona agent plays the build through the real UI (Playwright, `scripts/playtest/kit.mjs`) at its variant's viewport, pursuing its own goals. It is not given a task script, design intent, the goal list, or what changed.

## Brief given to each customer agent
- The persona file (`synthetic/panel/<id>.yaml`) and its variant.
- The scenarios for its archetype (`synthetic/scenarios/scenarios.yaml`), phrased in the customer's own words.
- The panel's global adjustments (patience, reading).
- How to drive the game (kit API) and where to save artifacts.
- The report schema (`report.schema.json`) and the rule: behave as the persona would, including quitting; when you would have quit, record it, then continue only to complete the record.

## Rules
- Play through the UI only (no API shortcuts), except Dan's long campaigns may fast-forward months via the UI's own controls.
- Record every hesitation, misread, retry and backtrack, with a screenshot.
- Each bug: exact steps, expected, actual, severity (S1 blocks progress or loses data; S2 wrong result or misleading; S3 friction; S4 cosmetic), screenshot.
- Score only after playing; give the reason for every score.
- Note the moment of any "this is a game" delight and any "this is a dashboard" disappointment, with screenshots.

## Output
`synthetic/runs/iter-NN/sessions/<variant>.json` (schema-valid) plus `<variant>.md` (human summary, at most 600 words) and screenshots under `synthetic/runs/iter-NN/sessions/<variant>/`.
