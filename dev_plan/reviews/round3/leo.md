# Round 3: Leo (streamer, chaos, 1440×900)

Scripts and screenshots are in `/tmp/claude-0/round3/leo/` (`s1*` to `s4*`, `api.sh`).

## Sessions

1. **Flashpoint, Water War / Pakistan.** In month 1 I massed troops on India and declared war. I got a "This ends your mission" warning. The Chronicle led with my crisis answer, "SHARIF'S ANSWER TO 'BEFORE THE STRIKE'", not the war. A nuke in the same month was refused ("only in wartime"). The run ended at month 1 with **WARMONGER, F**.
2. **One Term, Venezuela (Normal).** War on the USA in month 1 pulled in about 12 US allies, and the map lit up with red lines. A *Coup plot uncovered* card came in month 2 and I chose Purge. Stability then sat at 0% for 6 months with no further warning, and I was **DEPOSED by coup in month 8**. Bonus run as the USA: war on China, crackdowns. The *Impeachment looms* card came in month 10 and I was **IMPEACHED in month 16**.
3. **Legacy, Russia.** I nuked Ukraine in month 1: approval −2, no embargo, GDP unchanged, and Ukraine had two juntas in two months. I declared war on the USA, then nuked it in month 3: **NUCLEAR HOLOCAUST, "THE DESTROYER"**.
4. **Exploits (UI and API), Iran / North Korea.** I spammed orders, ordered with 0 capital, sent bad values and rapid-clicked Execute. Results are under Bugs.

## Spectacle wins

- War on the USA paints a web of alliance war lines across the globe.
- Coup and impeachment cards are tense, and both ends are now properly framed: "Tanks surrounded the palace at dawn", "Impeached and convicted".
- Archetypes finally land: Warmonger, The Destroyer. Failed covert ops are now reported honestly.
- The mission-ending warning before declaring war works.
- The share card now has score, month and URL.

## Letdowns

- **Your own catastrophe is never the headline.** The coup, the impeachment and the war declaration all lose the lead to "X: HARD POLICING" or "X'S ANSWER TO …". Impeachment is headlined "UNITED STATES VOTES FOR CHANGE". The share card quotes "VENEZUELA: HARD POLICING".
- **Nukes are anticlimactic.** The kicker says "DOMESTIC" and the copy says "Carried out", with no casualties, no map effect and no retaliation story. Approval goes *up* (+4 to +5.6) after nuking the USA, and the Chronicle shows a CLOSE CALL stamp. The holocaust end screen is a plain card with a single ✗ line. It scores 79 to 89, above my coup run (63).
- The war confirm is a native browser `confirm()` dialog.
- Flashpoints still can't host chaos.
- Text nits: "YOUR 1 MONTHS", "1 CLOSE CALLS", "knows it was us..".

## Bugs and exploits

| Sev | Bug | Repro |
|---|---|---|
| **P0** | **Free Denounce spam lifts approval with no limit.** The 6-month diminishing return doesn't apply within a single turn. | In the UI as Iran (Legacy), click *Denounce United States* 20 times, then Execute: approval goes 28 → 63% (+35). Through the API, 30 Denounces took North Korea from 44 to 96%. |
| **P0** | **A negative `MILITARY_PROCURE` creates GDP and bricks the save.** | `POST /turn` with `{"type":"MILITARY_PROCURE","value":-500000}`: North Korea's GDP goes $27.6B → $1,024B. Every later `/turn` and `/load` then fails with Zod "countries[28].airpower too_small", so the save is permanently dead. API-only, but the value is never validated. |
| P1 | **GDP collapses while the UI reports growth.** | Venezuela with war and crackdowns: GDP $85B → $15B in 8 months. The HUD keeps showing +3.4% and the Chronicle says "Strong growth lifts the national mood" every month. The USA at war showed the same pattern. |
| P1 | The player's deposition, war or nuke isn't the lead story or the share-card headline. | Any coup, impeachment or war run (`s2-04-chron-7.png`, `s2usa-09-chron-15.png`, `s1-04-chronicle1.png`). |
| P1 | Nuking a superpower *raises* approval, and holocaust scores beat survival runs. | Session 3: approval +4.2 and +5.6 after the US strike; score 89 against 63 for the coup run. |
| P1 | Rapid-clicking Execute skips months: the second click closes the Chronicle overlay and the third executes an empty month. | Click Execute about 10 times quickly: 2 turns resolve, and you never see the first month's Chronicle. |
| P2 | No second coup warning while stability sits at 0% for 6 months after a purge. | Session 2, months 3–8. |
| P2 | Junta leaders get stock names reused from the docs ("General Olena Kovalenko" in Ukraine). After the nuke, China signed a pact with Russia. | Session 3, month 1. |

No uncaught JS errors and no HTTP 5xx came up. The only console errors were tile `ERR_TUNNEL`.

## Scores

| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 7 | 6 | 7 | 3 | 6 | 5 |

(R2: 6 / 6 / 8 / 4 / 5 / 5)

## Top 3 changes

1. **Close the exploits.** Apply the denounce decay per order within a turn (or allow 1 denounce per target per month). Clamp `value` and other numbers on every action in `/turn`, and make the engine refuse to save a state that fails `WorldStateSchema`.
2. **Make the player's catastrophe the front page.** When the player is deposed, uses a nuke or declares war, that becomes the lead headline, the share-card quote and the share-card style: give the holocaust and coup cards their own art and colour. Show the nuke's casualties, the retaliation chain and an approval crash.
3. **Keep the economy display honest.** HUD growth and "Strong growth" causes must reflect the actual monthly GDP change, including war losses, embargo and stability damage.
