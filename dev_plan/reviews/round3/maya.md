# Round 3: Maya (casual, 390×844 phone)

Screenshots and logs: `/tmp/claude-0/round3/maya/`. Each crisis choice came from a policy that reads the card's arrows, plus up to two advisor suggestions a month.

## What I played
- **Daily *Fire on the Nile*, Egypt (tips on):** Mission complete, **A ★★★**, "Steady Hand", score 113. About 10 min.
- ***Caracas after Maduro*, Venezuela:** Mission complete, **A ★★★**, "The Reformer", score 104, 2 close calls and 2 comebacks. About 9 min.
- ***Scarborough Line*, Philippines:** **Mission failed, D**, "Loyal Ally", score 90. In month 2 I took "Join the war" when the US asked for help against Iran. I was then stuck in a Philippines–Iran land war for 10 months and lost it. About 9 min.

## Delight
- Venezuela is great. *Machado comes home* ("Offer her a ministry"), *The Barrels* ("the president who sold the oil Chávez nationalised") and *The election date* ("Postpone until conditions allow") read like this year's news. The close calls gave it an arc, and the debrief is excellent.
- Advisors now cite the mission ("UAE needs 40+, now 29"). This round-2 complaint is mostly fixed.
- On the phone, the chosen option now sticks above Execute (`daily/m01-before-exec.png`), and tip 1 talks about "the top" and "below it".

## Friction and confusion
- **Title screen on phone.** A sticky "Saudi Arabia, Bab al-Mandab / Take office" panel covers about 45% of the screen and sits over the Daily box on first load (`00-title.png`, `00-title-scrolled.png`). The default seat is Saudi Arabia, not today's crisis.
- **The briefing repeats itself.** The same paragraph appears twice: once in italics, then again in the mission box (`daily/m01-ov0.png`). It also never lists the mission conditions, which I only saw at the end.
- **Option arrows don't flag the mission.** "Deniable strikes" shows UAE ▼▼ while the UAE is sitting on the mission's 40 minimum, and "Reinforce and shadow" pushes Ethiopia ▼▼ under a no-war mission (`daily/m03-picked.png`). Nothing warns me.
- **The Chronicle doesn't tell me what hurt the mission.** UAE fell from 40 to 29 in month 1, and "Score 0.0" sat next to Approval +6.9 (`daily/m02-ov0.png`).
- **Courting doesn't work, round 3.** I courted Ethiopia 5 times and relations went −98 → −99. In month 12, Egypt's advisors suggested "Court North Korea", and Venezuela's suggested "Court Cuba" to fix "world standing".
- The daily ended all green again: 0 close calls and zero tension (`daily/m13-ov1.png`).
- The HUD's GDP growth figure overlaps the ◆ (`daily/m03-picked.png`).

## Bugs
- **P1: Allies don't leave the war when the principal makes peace, and ceasefire suggestions fail with no explanation.** Repro: In month 2, choose "Join the war" on *United States asks for help*. The US and Iran agree a ceasefire in month 5, but the Philippines fights Iran over a land front for 10 months. "Propose ceasefire" is suggested and rejected 9 times. The run ends with "Iran has defeated Philippines". The option also carries no warning that it may wreck your mission. (`philippines/log.txt`, `philippines/m03-desk.png`)
- **P1: The ally-help crisis contradicts the war state.** "United States' defenses against Iran are buckling" appeared in the same month the Chronicle ran "United States makes sweeping gains".
- **P1: The HUD and Chronicle claim growth while GDP falls.** On the Philippines, the HUD shows a constant 4.3% while GDP falls every month from $502B to $417B. "Strong growth lifts the national mood" appeared 12 out of 12 months.
- **P1: The phone title screen hides the daily.** The sticky start panel covers "Play today's crisis" on first view (`elementFromPoint` at the button lands on the panel), so Take office starts Saudi Arabia.
- **P2: Headlines use the last word of the name.** "JR.'S ANSWER TO…" for Marcos Jr.
- **P2: Grammar errors.** "President of Philippines", "You are President … You are the President…", "2 CRISISES", "2 crisis unanswered", "United States' offer" (`venezuela/m05-desk.png`).
- **P2: The share text and card headline is my own decision, with broken nested quotes.** `"RODRÍGUEZ'S ANSWER TO "THE ELECTION DATE": POSTPONE 'UNT…` (`share-card.png`). After Copy text, "Share result" stays labelled "Copied!".
- **P2: Odd arrows and events.** On *Coup plot*, "Purge the plotters" gives Legitimacy ▲▲ and "concede reforms" gives Legitimacy ▼▼. Israelis flee to Egypt as refugees.

## Scores
| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 7 | 6 | 7 | 5 | 7 | 6 |

## Top 3 changes
1. **Mission-aware cards.** Add a red "⚠ mission" tag on any arrow that pushes a mission metric toward failure, and a Chronicle line naming what moved a mission metric ("UAE 40 → 29: you struck its proxies").
2. **Sane wars for small allies.** Co-belligerents exit when the principal signs a ceasefire. No land front between non-neighbours (make it an expeditionary contribution instead). Gate "asks for help" on the ally actually losing.
3. **Phone title screen.** Lead with the daily, and show the sticky start panel only after a flashpoint or seat is tapped. Add a share headline that's a world event, not my own decision.
