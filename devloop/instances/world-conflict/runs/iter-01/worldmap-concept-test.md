# World map concept test (G11, RS-003)

For synthetic customers answering from screenshots only. Answer as your persona, with your persona's `knowledge` attribute: flag every name, place or event you would not know. Do not read `design-worldmap.md` first.

## Material

All in `devloop/instances/world-conflict/runs/iter-01/concepts/`. The live HTML mocks are `worldmap-a.html` and `worldmap-b.html` (open with `?era=1960|1990|2025|2026`, `&sel=<situation id>`, `&hover=<country id>`).

| Id | File | What it shows |
|---|---|---|
| S0 | `../../iter-00/shots/marcus-term/002-term.png` | Today: the title globe (the same globe for every era and mode) |
| S1 | `worldmap-a-1960-1440.png` | Concept A "Situation Room", 1960, desktop: blocs coloured, every situation pinned with a name, rival lines, full key |
| S2 | `worldmap-a-2026-1440.png` | Concept A, 2026, desktop, Hormuz pin opened (card next to the pin) |
| S3 | `worldmap-a-1960-390.png`, `worldmap-a-2026-390.png` | Concept A on a phone (second one with a situation opened as a bottom sheet) |
| S4 | `worldmap-b-1960-1440.png` | Concept B "Atlas", 1960, desktop: stability shading, bloc outlines, five numbered fires, Berlin opened in the side panel |
| S5 | `worldmap-b-1990-1440.png`, `worldmap-b-2026-1440.png` | Concept B, 1990 (German reunification opened) and 2026 (hovering Ukraine) |
| S6 | `worldmap-b-1960-390.png`, `worldmap-b-2026-390.png` | Concept B on a phone |
| S7 | `worldmap-timetravel-strip.png` (frames `worldmap-tt-0..3.png`) | The era switch from 2026 to 1960 as four frames (about 0.9 s in the game) |

## Questions (answer each in 1 to 3 sentences, cite the screenshot id)

**Q1 First read (S1 vs S4, 5 seconds each).** Without reading the side panel: what year is it, and what are the two or three biggest things going on in the world? Which concept told you faster?

**Q2 Era difference (S1/S4 vs S2/S5).** Do 1960, 1990 and 2026 look like different worlds? Name one thing on the map that changed between eras. Is anything on the 1960 or 1990 map wrong or out of place for that year (names, borders, sides, leaders)?

**Q3 Names on the globe.** Can you read the country names at the size shown (S1, S4, and on the phone S3, S6)? Did any name sit on top of a pin or another name? Which names were missing that you looked for?

**Q4 Pins and lines.** Pick one pin you do not understand and say what you think it means. Do the hollow dashed pins ("brewing") and faded pins ("frozen") read as different from the solid ones? Do the dotted lines read as "rivals" and the solid red as "a war front"?

**Q5 Off the edge.** In S4, situations 3 to 5 (Taiwan, Cuba, Korea) are on the far side of the globe and show as small markers on the rim. Did you notice them? What would you expect tapping one to do?

**Q6 Details.** In S2 (card next to the pin) and S4 (card in the side panel), what can you learn about a situation and its leaders? Which placement is easier: next to the pin, or in the panel? On the phone (S3 second shot), is the bottom sheet clear?

**Q7 Density.** A shows every situation with a name; B shows five numbered fires and has a switch "Show all 8 situations and rival lines". Which would you leave on by default? Would you ever flip the switch?

**Q8 Colour.** A colours countries by bloc (NATO, Warsaw Pact...); B colours them by stability (shaky glows orange-red, solid recedes to slate) with bloc outlines. Which colouring helped you choose a nation? Could you tell the colours apart?

**Q9 The time-travel moment (S7).** Switching era rolls the year, turns the globe and fades in the old world over about a second. Does that feel like a moment worth having, or a delay? Would you switch eras more because of it?

**Q10 Fit (S0 vs S1/S4).** Does the new globe fill the screen better than today's? On the phone, is the globe big enough to tap a pin?

**Q11 Choice.** A, B, or B with A's switch on? One sentence why. What one change would make your pick better?

## Scoring (for the synthesis)

- Q1 correct era + at least two situations named within the persona's knowledge: pass per concept.
- Q2 any reported anachronism is a P1 content bug (log in `backlog.md`), whichever concept.
- Q3 any reported label-on-pin collision or illegible label: fails acceptance 7 or 9 of `design-worldmap.md`.
- Q5 under half of respondents noticing rim markers: make them larger or add the count chip ("3 more on the far side").
- Kill criteria for the recommendation (B default with A's switch): if 6+ of the 9 personas pick A outright, and Ruth and Noah do not report clutter in S1, ship A as the default instead. If Ruth or Noah say B's stability colours are unclear (Q8), the default colouring becomes Blocs in both.
