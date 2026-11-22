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
