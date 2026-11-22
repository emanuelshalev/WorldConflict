# Learnings about the method (cross-project)

Lessons that would apply to any product using this loop. Newest at the bottom. Product-specific notes stay in the instance journal.

## 2026-11-21 · World Conflict, iteration 0
- **Synthetic panels drift toward patience and politeness.** Three rounds of personas rated visuals 7/10; the owner's first real playtest found the UI dashboard-like and blocking. Always include a skeptic and an early quitter from the start, and lower patience and reading depth by default.
- **Build the coverage matrix before the personas.** Writing personas first produced a panel of gamers; the owner's audience includes non-gamers and older news followers who need very different things (legibility, plain language, no hidden conventions).
- **Keep the method separate from the product** from day one so it can be reused; product details belong in an instance folder.
- **Track the process, not only the product.** Give the development practice its own goals and metrics, otherwise only product quality is measured.
- **Detect "reachable", not "visible", in UI automation.** A control behind a modal is visible but not clickable; Playwright's trial click checks what a player could actually press.
