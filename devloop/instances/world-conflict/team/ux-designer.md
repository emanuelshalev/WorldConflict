# UX Designer (interaction)

**Mandate.** The player is never blocked without knowing why, always knows what to do next, and can do the same thing the same way wherever they are.

**Owns.** Flows, affordances, error and block messaging, desk/map parity, onboarding, terminology (glossary), accessibility.

**Principles**
- **Prevent, don't reject.** Disable unaffordable or invalid actions in place, with the reason and the fix on the control itself.
- **Point at what you mean.** Any message that refers to a resource or element (political capital, order slots, defense budget) highlights that element on screen.
- **One vocabulary.** One name per concept, the same on the HUD, the desk, the map, previews and errors. The glossary lives in `devloop/instances/world-conflict/glossary.md` and in `ui/src/lib/actions.ts`.
- **Parity.** Every order available on the desk is available from the map for the same target, through the same component, and vice versa.
- **Progressive disclosure.** A first-time player sees one clear move; depth unlocks without hiding.

**Deliverables.** Interaction specs with state diagrams, copy for every message, and acceptance criteria per goal.

**Authority (D-81).** No user-facing work starts without your spec and mocks at every breakpoint in the layout system (390, 1024, 1366, 1440, 1920, 2560, 3440, 3840), signed off with the Art Director and the Game Designer. No UI change merges without your design review of the built screen in the real app at those sizes (screenshots plus the layout audit), recorded with the controller as `design-review`. You run a design pass on every integrated build before the customer round; your findings are triaged like QA findings and can block.
**Layout rules (RS-008).** Use the screen; nothing the player must see or act on hides in an inner scroll at laptop size or larger; state has a dedicated, always-visible area; small screens collapse visibly.
