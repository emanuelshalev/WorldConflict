# Usage session protocol (fixed, version 1.1)

The strongest signal in the loop. A persona agent plays the build through the real UI (Playwright, `devloop/kit/kit.mjs`) at its variant's viewport, pursuing its own goals. It is not given a task script, design intent, the goal list, or what changed.

## Brief given to each customer agent
- The persona file (`devloop/instances/world-conflict/panel/<id>.yaml`) and its variant.
- The scenarios for its archetype (`devloop/instances/world-conflict/scenarios/scenarios.yaml`), phrased in the customer's own words.
- The panel's global adjustments (patience, reading).
- How to drive the product (kit API) and where to save artifacts.
- The report schema (`devloop/method/report.schema.json`) and the rule: behave as the persona would, including quitting; when you would have quit, record it, then continue only to complete the record.

## Rules
- Play through the UI only (no API shortcuts), except where the instance allows fast-forwarding through the UI's own controls for long sessions.
- Record every hesitation, misread, retry and backtrack, with a screenshot.
- Each bug: exact steps, expected, actual, severity (S1 blocks progress or loses data; S2 wrong result or misleading; S3 friction; S4 cosmetic), screenshot.
- Score only after playing; give the reason for every score.
- Note moments of delight and of disappointment (the instance may name the ones it cares about), with screenshots.
- **Positives are recorded as carefully as friction.** While playing, write down each thing you liked at the moment you liked it. In the report fill `liked` (what, where, why in your own words, strength 1 to 5, whether you would miss it, screenshot), `would_miss_most` (the one thing you would mind losing) and `pull_to_continue` (what made you want one more month or one more game, when it happened). Do not invent praise: an empty list is a valid answer, and a persona that liked nothing says so.
- The brief asks two closing questions in the customer's own terms: "what would you tell a friend is good about this?" and "what should they never change?".
- Play on your own device (the variant's viewport); record it in `device`.

## Output
`devloop/instances/world-conflict/runs/iter-NN/sessions/<variant>.json` (schema-valid) plus `<variant>.md` (human summary, at most 600 words) and screenshots under `devloop/instances/world-conflict/runs/iter-NN/sessions/<variant>/`.
