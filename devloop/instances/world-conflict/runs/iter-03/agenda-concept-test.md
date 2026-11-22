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

---

# Round 2 (D-70): the hybrid

Same setup, same personas and devices, fresh eyes (do not show round 1 shots or results). One design, no A/B: show the `agenda-h-*` screenshots at each persona's own width (`-390.png` phones, `-1024.png` Ruth, `-1440.png` laptops). Do not use the words "recommended", "skip", "step" or "done" in questions before the persona does.

R1. First look (`agenda-h-desk-m1`, 10 seconds, then hide). "What do you have to do this month? Say it as a to-do list." "Where would you press first?" Pass: names going through the things (or "answer the crisis, then the order") and a first press on an option or Next, not Execute.

R2. Month 4 (`agenda-h-desk-m4`). "How many things this month, and how many are done?" "What will happen if you press Execute month now?" Pass: "6, 1 done"; names at least two of: your choice happens, ministers take meetings (with a cost), proposed orders do not run.

R3. Choosing and skipping (same mock). "How do you answer Xi? What happens if you skip the call, exactly?" Pass: presses an option card; for Skip names the Foreign Minister answering, the free cost and China -3.

R4. After a skip (`agenda-h-skip`). "What happened to Xi's call? Can you change your mind? What is this screen asking now?" Pass: Foreign Minister answered, China -3, Undo; routine meetings can be left to ministers.

R5. All of them (`agenda-h-list`). "How would you jump to the proposed orders?" Pass: "All 6" or "List", then the row.

R6. Review (`agenda-h-review`). "What will Execute do? How would you undo one thing?" Pass: names the decisions and the capital carried over; Change or Undo on a row.

R7. Map (`agenda-h-map`). "What is left to do, and how do you do it from the map? What does the button in the middle of the bottom bar do?" Pass: answers Xi from the card; "opens the recommendations to check", not "approves".

R8. Clickable or not (`agenda-h-desk-m4`, `agenda-h-review`). "Point at five things you can press and three you cannot. Anything you are not sure about?" Record every doubt as friction of kind "affordance".

R9. Experts only (`agenda-h-fulldesk`): "Would this view let you go at your pace? Anything still slowing you?"

R10. Words. "Which words here did you not understand?" (expect to check: recommended, routine meetings, political capital, execute).

## Round 2 decision rule
- Ships to build if at least 7 of 9 pass R1 to R3 together, at least 7 of 9 pass R7, and no affordance doubt is reported by 3 or more personas.
- Any doubt reported by 2 personas: named fix before build, no retest.
- Fewer than 7 of 9 on R1 to R3: escalate the options to the CEO (D-70 risk).
