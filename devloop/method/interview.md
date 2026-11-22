# Interview protocol (fixed, version 1.0)

Run before the first build of a cycle and before any major planning decision. One fresh session per respondent (no shared memory). The interviewer is blind to the answer the team hopes for: it receives only the persona file, the product concept and the candidate list.

1. **Problem interview (no product shown).** How do you get this job done today? When did you last play something like this, what made you stop, what did it cost you?
2. **Concept reaction.** One neutral paragraph describing the product (`<instance>/protocol/concept.md`). What would you stop using if you adopted it? What would make you close it in the first 2 minutes?
3. **Forced trade-off.** Spread exactly 100 points across the candidate improvements in `<instance>/protocol/candidates.md`. Then cut the two you care least about. Rankings, not ratings.
4. **Objections.** What would stop you recommending it? Who else would need to like it (friends, chat, classmates)?
5. **Past behavior check.** Name a product of this kind you abandoned and the exact moment you quit.

**Output (JSON, one file per respondent):**
```json
{ "persona": "maya", "variant": "maya-phone", "panel_version": "x.y",
  "pains": ["ranked", "..."], "points": {"C1": 30, "C2": 0},
  "cut": ["C7", "C9"], "objections": ["..."], "quit_moment": "...",
  "verbatim": "one sentence in the persona's voice" }
```
