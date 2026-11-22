# Concept test: the month as a guided agenda (D-65)

For the synthetic panel. About 10 minutes per persona. Static mocks, no live game. Run before WP-A2 starts; results go to `runs/iter-03/agenda-concept-results.md` (one section per persona, verbatim answers first).

## Setup
- Personas: all nine (`panel/*.yaml`), with the global adjustments in `panel/panel.yaml`. Use each persona's own device: phone shots (`-390.png`) for Noah, Maya, Olivia; tablet (`agenda-a-desk-m4-1024.png`) for Ruth; laptop (`-1440.png`) for Dan, Marcus, Sam, Leo, Priya.
- Show only the screenshots in `runs/iter-03/concepts/`. Do not show `design-agenda.md` or explain the design. Do not use the words "agenda", "skip" or "staff pick" in questions before the persona does.
- Half the panel sees variant A first, half variant B first (Dan, Ruth, Maya, Leo: A first).

## Tasks and questions

T1. First look (show `agenda-a-desk-m1` or `agenda-b-desk-m4` per order; 10 seconds, then hide).
- "What do you think you have to do this month? Say it as a to-do list."
- "Where would you press first?"
- Pass: names the list of items and that they go through them; names a first press on the current item.

T2. Month 4 (show `agenda-a-desk-m4`).
- "How many things do you have to deal with, and how many are done?"
- "What happens to the CNN interview?"
- "What will happen if you press Execute month right now?"
- Pass: "8, 2 done" (or equivalent); "a deputy answers"; names deputies and proposals not running.

T3. The three choices (same mock, point at the handling box).
- "Describe what each of the three buttons does, in your own words."
- "If you do not want to bother with this call, what do you press, and what will happen?"
- Pass: distinguishes own answer, the staff's answer and sending a deputy; states the consequence of skipping without guessing.

T4. Skip (show `agenda-skip`).
- "What just happened to Court India? Can you change your mind?"
- "Where would you look later to see what you skipped?"
- Pass: not run, capital kept, Undo; points at "Skipped" in the right column.

T5. Map mode (show `agenda-map`).
- "You are on the map. What is left to do this month, and how do you do it from here?"
- "What does the green button approve?"
- Pass: reads "3 of 8 handled" and the current item; names the staff picks listed (RS-005).

T6. Clickable or not (show `agenda-a-desk-m4` and `agenda-affordance`).
- "Point at five things you can press and three things you cannot. Any you are not sure about?"
- Pass: no static element named as pressable and no button named as static. Record every uncertain element as friction of kind "affordance".

T7. Compare (show the other variant, same month).
- "Which of the two would you rather play with, and why? What does each make harder?"
- Experts (Dan, Marcus, Sam): "Would you use the step-by-step mode, or switch to Full desk? What would slow you down?"

## What we record per persona
- Verbatim answers per task; pass or fail per task with the reason.
- The to-do list as the persona stated it in T1 (exact words).
- Every affordance doubt (element, what they believed, which mock).
- Variant preference and reason; expert speed concerns.
- Any word they did not understand (e.g. "staff pick", "deputy", "handled").

## Decision rule
- Variant A ships if at least 7 of 9 pass T1 to T3 on A and A is preferred or tied by at least 5 of 9; otherwise review B's bar for the laptop layout.
- Any persona failing T3 on the Skip meaning: change the Skip copy before build.
- Two or more experts saying Guided slows them: Full desk becomes the default from month 4 for players who switched once.
- Any affordance doubt reported by two or more personas becomes a named fix in WP-A5.
