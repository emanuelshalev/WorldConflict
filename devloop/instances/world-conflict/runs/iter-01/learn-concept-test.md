# Concept test: learn as you play (G12, C14)

Owner: UX Designer. Spec: `design-learn.md`. Run by: every panel persona (`panel/*.yaml`), answering as their persona, using their `knowledge` attribute.

## What you look at

All screenshots are in `runs/iter-01/concepts/`. Look at the one for your device first (phone personas: the `-390` files; tablet and laptop personas: the `-1440` files; also look at the other size once).

| Variant | Screens | In one line |
|---|---|---|
| **A: Underline and peek** | `learn-a-underline-1440.png`, `learn-a-underline-390.png` | Less known names are softly underlined in the crisis text. Hover or tap one for a single line, "More" for the story, a small map and what is true in your game. |
| **B: Briefing panel** | `learn-b-briefing-1440.png`, `learn-b-briefing-390.png` | The text stays clean. A "Briefing" tab (desktop) or button (phone) lists every name on the card with one line each; pointing at one lights it up in the text. |
| **C: Quiet "i" and codex** | `learn-c-info-1440.png`, `learn-c-info-1440-full-drawer.png`, `learn-c-info-390.png` | The text stays clean. A small "i" ends each paragraph, and a "What is going on here?" button opens a full briefing: map, who is who, why it matters, what really happened. New entries go into a codex. |
| **All: the setting and the codex** | `learn-onboarding-1440.png`, `learn-onboarding-390.png` | Asked once: "How well do you follow world news?" (Guide me / Some help / I know this). Settings to change it. The codex of everything you met. |

The crisis is real: Ukraine, November 2026, a US proposal for a "free economic zone" in Donetsk. Read the crisis text in any screenshot before answering.

## Instructions to the customer

Answer as your persona, with your persona's knowledge (`knowledge` in your yaml, evidence `observed / RS-003`). Do not use what you, the model, know about the world. If your persona would not know a word, say so.

## Questions

**Q1. Unknown words.** Read the crisis text (the paragraph starting "US mediators propose" and the one starting "Washington wants an answer"). List every name, place or term your persona would not know or could not explain to a friend. For each, would you want to look it up right now, later, or never?

**Q2. First reaction, per variant.** For A, B and C in turn: in one or two sentences, what is the first thing you notice, and would you use it in your first game? (yes / maybe / no, and why)

**Q3. Did it explain?** Pick the term you most wanted explained in Q1. In the variant you like best, can you see how you would get its explanation, and is the explanation shown (where visible) clear in one read? Score 1 to 5 (1 = I could not find it or did not understand it, 5 = found it at once and understood it).

**Q4. In the way?** For each variant: does it get in the way of reading the crisis and choosing? Score 1 to 5 (1 = constantly in my way, 5 = never noticed it unless I wanted it).

**Q5. What would you turn off?** Look at `learn-onboarding-*.png`. Which level would your persona pick when asked once (Guide me / Some help / I know this)? Which single element, in any variant, would you switch off first (underlines, the "i", the briefing tab, "In your game" lines, the codex unlock toast, "brief me on each new crisis", something else)?

**Q6. The deep briefing.** Look at `learn-c-info-1440-full-drawer.png` (or `-390`). Would you open "What is going on here?" before choosing? Which part would you read first: the one-line summary, the map, who is who, why it matters, or what really happened? Is anything missing that you would need to choose well?

**Q7. Codex.** Would "18 of 31 met" and the NEW badges make you open more entries, or do you not care? Would you look at the codex after the game ends?

**Q8. Forced 100-point split.** Split exactly 100 points across these, by how much each would make your persona want to play and keep playing:

| Item | Points |
|---|---|
| A. Underlines with hover/tap explanations in the text | |
| B. Briefing panel listing the names on the screen | |
| C1. Small "i" per paragraph | |
| C2. "What is going on here?" full briefing with map and who is who | |
| D. Codex of everything met (with "entries met" progress) | |
| E. "In your game" lines (what is true in my game right now) | |
| F. Asked once how much help I want, with a quick switch | |
| **Total** | **100** |

**Q9. Pick one.** If the team could ship only one of A, B or C (the setting in "All" ships with any of them), which one, and the one sentence that would most improve it?

**Q10. Trust.** Each explanation carries "As of Nov 2026" and a source count. Does that matter to your persona? Would one wrong fact make you stop trusting the game? (Priya and Marcus: check every fact you can see and list any you believe is wrong or out of date.)

## Output format

Append to `runs/iter-01/sessions/<variant>-learn.md` (one per persona), with:

```
persona: <id>
knowledge level picked (Q5): Guide me | Some help | I know this
unknown terms (Q1): [term: now|later|never, ...]
Q2: A: <yes|maybe|no> <why>; B: ...; C: ...
Q3: <term> <variant> <1-5> <why>
Q4: A <1-5>, B <1-5>, C <1-5>
Q5: turn off first: <element>
Q6: open? <yes|no>; first read: <part>; missing: <...>
Q7: <...>
Q8: A __ B __ C1 __ C2 __ D __ E __ F __ (sum 100)
Q9: <A|B|C> + <one sentence>
Q10: <...>; facts flagged: [...]
```

Also emit the JSON twin (`<variant>-learn.json`) with the same keys, so `devloop/kit/feedback-digest.mjs` can total Q8 (weighted by panel weights) and Q4 per knowledge level.

## How the team reads the result

- **Primary:** Q8 weighted totals, split by knowledge level (Guide me pickers vs I know this pickers). The recommendation in `design-learn.md` holds if Ruth, Noah, Maya and Olivia put most points on A + C2 + F, and Priya, Marcus and Dan score Q4 at 4 or more for the variant at their own level.
- **Kill criteria:** any variant scored Q4 = 1 or 2 by two or more expert personas at their own level is not the default for "I know this". Any variant scored Q3 below 3 by Ruth or Noah is not the default for "Guide me".
- **Content:** every fact flagged in Q10 goes to the Content Consultant before build (one is already known: "before the midterms" in `data/flashpoints/ceasefire-or-collapse.json` while the midterms were on 3 November 2026 and the game opens later in November).
