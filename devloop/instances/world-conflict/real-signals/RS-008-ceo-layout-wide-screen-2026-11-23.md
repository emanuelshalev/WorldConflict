# RS-008: CEO playtest of iter-3 on main (2026-11-23), layout on a large screen

Severity: S2
Status: open

Build played: `main` at tag `iter-3` (06f937b), a very large monitor.

> Tested iter3, the UI is not good. I don't like the scrolling block at the center: with a wide screen there is a central piece with wasted space on the sides. I can scroll to see more things at the bottom, but it is unclear that such things exist and a player may miss them. The UI elements should adjust to leverage screen size; elements need to be visible without scrolling. If there is enough space we need to leverage it; if there isn't, elements need to exist, maybe collapsed, and expand as needed. But we cannot hide things in a scroll or leave the screen empty. One more element that scrolls is the one on the right with political capital: I have a massive screen and that section is scrolling within a tiny space, which makes no sense. Important things like state should be visible and should have a dedicated space. We cannot scroll all these things within a tiny space. Bad UI arrangement.

## What it means
- The desk is a fixed-width centre column: on wide screens the sides are empty and content continues below the fold in a scroll the player may never discover.
- The right rail (political capital, Recommended, Execute) scrolls inside a small box even on a huge screen (the QA3-S3-3 fix made the Recommended list scroll inside the rail: it met the letter of "keep Execute visible" and broke this).
- Important state (political capital, budget, the month's to-do items, mission status) has no dedicated, always-visible space.

## Rules it sets (layout, all screen sizes)
1. Use the space: content grows with the viewport (columns, larger panels) instead of a fixed centre column with empty sides.
2. No hidden scrolling for things the player must see or act on: at a laptop size or larger, the month's items, state and actions fit without inner scrolling; on small screens items exist collapsed (a visible summary with a count) and expand on demand.
3. State has a dedicated, always-visible place.
4. When something does not fit, it collapses visibly (title, count, expand control), never silently below the fold.

## Why the panel missed it
Personas play at 390, 1024, 1440 and 1920 wide; nobody plays on a large monitor, and no guard measures inner scrolling or unused space.
