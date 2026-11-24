# Building the customer panel

1. **Fill the coverage matrix before writing personas.** List the axes along which customers differ in ways that change what they need (for example: domain motivation, experience with this kind of product, age and digital fluency, time available per session, device, accessibility needs). Each archetype is a point in that space; together they must cover every cell the owner wants to serve. Write the matrix in the instance `panel/panel.yaml`.
2. **Archetypes by job to be done**, not by demographics. 4 to 6 is the default; widen when the owner asks for a wide net, and record why in the ledger. Every panel has a **skeptic** and an **early quitter**.
3. **Variants.** Each archetype has 2 or more variants (device, temperament, scenario). One variant plays per iteration, rotating.
4. **Every attribute carries an evidence tag**: `assumed` (imagined), `inferred` (from synthetic rounds or logs), `observed` (confirmed by a real person, with the signal id). Track the mix; aim to shift it from assumed to observed.
5. **Weights** reflect the target market and are corrected by real signals.
6. **Global adjustments** (patience, reading depth) apply to all personas when real people prove the panel too patient or too careful, which is the usual direction.
7. **Version the panel** like code; every change cites its evidence in the ledger.
8. **Own devices.** A customer plays on the device of the variant that is up this round. Builders review on a reference screen; customers are never moved to it. When a round must deviate (a device the kit cannot drive, a sample kept small on purpose), the brief says so, the report records the device played, and the comparison with other rounds states it.
9. **The panel is remembered.** Every round is added to the customer record (customer-advocate.md); persona files are corrected from real signals (calibration.md), never from what the team wishes a customer had said.

## Persona template
See `../templates/panel/persona.yaml`.
