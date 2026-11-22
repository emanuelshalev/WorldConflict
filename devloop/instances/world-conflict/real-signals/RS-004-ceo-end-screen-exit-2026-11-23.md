# RS-004: CEO playtest of iter-2 on main (2026-11-23)

Build played: `main` at tag `iter-2` (67c9b11). Fixes for iteration 3 live on dev/rc1-synthetic-loop until `iter-3` is published.

> At the end when the score card is revealed there is no clear way to go back to the start page to play again. I am stuck with the final report.

## Cause
The report view's header offered only "Replay the reveal" and "Compare runs"; the single "New game" button sat at the very bottom inside the ranking section. During the staged reveal there was no exit at all before the last stage.

## Fix (2026-11-23)
Play again, Replay same opening and Main menu in the report header; Play again and Main menu pinned in the report rail; a Main menu button always visible during the staged reveal. Guard: `scenarios-qa/regressions/RS-004.mjs` (laptop and phone, staged reveal and report).

## Calibration
No persona reported it: the panel's "reach the end" sessions stopped judging after the ranking stage and never tried to leave. **Correction:** the customer brief now asks end-reaching personas to start a second game from the end screen.
