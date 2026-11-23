# RS-001: CEO playtest of v0.9.0 (2026-11-21)

Severity: S2
Status: addressed

Source: the CEO played the build tagged `v0.9.0`. This is a real signal and outranks any synthetic report.

## Verbatim (condensed)

> The idea is good, the direction is good, but we are still not there in terms of rich visuals and intuitive play.
> Let the player not feel blocked: a bunch of things cannot be done because of constraints, the same message pops up, and the reasons are unclear.
> "Not enough political credit": I see a credit bar, very small, on the right; it is very unclear if we are referring to that. If so, that is "credit", not "political credit". Things must be clear and coherent. The element a warning refers to can be highlighted so the user knows what we are talking about.
> Actions in the desk and actions in the map have no parity.
> Even though the content and intention are good, it is unclear what is expected from the player.
> Suggestions? Where are the suggestions?
> The UI for the actions still feels like a dashboard created by AI. We need serious visual design: elements that are not just simple misaligned buttons with words. I want to feel that I am playing, with a reactive rich UI, not managing buttons in a dashboard.

## Mapping to archetypes (calibration step 1)

| Statement | Closest archetype | Was it predicted by the old panel? |
|---|---|---|
| Blocked, same message, unclear reason | Olivia, Maya | No. Round-3 personas were patient and read rejection text. |
| Warning does not point at the element it means | Olivia, Sam | No. |
| "Capital" vs "political credit/capital" naming | Sam | Partly (round 3 UX noted two vocabularies). |
| Desk vs map parity | Dan, Sam | No. |
| Unclear what is expected | Maya, Olivia | Partly (round 1 Maya: "What's the goal?"). |
| Suggestions not visible | Maya, Olivia | No (round 3 praised advisor suggestions). |
| Dashboard feel, not a game | Sam, Leo, Olivia | No. Round 3 rated visuals 7/10. |

## Gap and correction (calibration steps 3 to 5)

- **Gap:** the panel was too patient, read too carefully and was too polite about craft. It had no skeptic and no early quitter. This matches the research finding that synthetic respondents are more positive and less varied than real people.
- **Correction:** added Olivia (early quitter) and Sam (skeptic); lowered patience and reading across the panel (`panel.yaml` global adjustments); added the deal-breakers above with evidence `observed / RS-001`; raised the release gate (see `../README.md`).
- **Ledger check:** decisions that relied on round-3 visual scores (7/10) are flagged for review: the desk redesign and the game-feel pass are kept (no removal) but are not considered done.
- **Hold-out:** the statement about the credit bar is kept as a hold-out check: the panel must independently report the naming/visibility problem on the v0.9.0 baseline before any fix, which tests whether the corrected panel now predicts the CEO.
