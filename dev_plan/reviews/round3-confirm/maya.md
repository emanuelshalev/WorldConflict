# Round 3 confirmation: Maya (casual, 390×844 phone), 2.0.0-rc.1

Scripts, logs and screenshots are in `/tmp/claude-0/confirm/maya/`. Crisis choices came from a policy that reads the arrows and avoids "⚠ mission". It also took up to two advisor suggestions a month. In both flashpoints it was told to pick "Join the war" if the ally card ever appeared.

## What I played
- **Daily *Fire on the Nile*, Egypt (tips on):** Mission complete, **A ★★★**, "Steady Hand", score 108, 0 close calls. About 9 min.
- ***Scarborough Line*, Philippines:** Mission complete, **B ★★☆**, "The Reformer", score 104. I missed only the stability bonus. About 8 min. Last round this was a D. A second run that always took the first option also got B ★★☆.
- ***Water War*, Pakistan (Brutal):** **Mission failed, D**, score 79 against a par of 82, 1 close call. About 6 min.

## Previous issues
| Issue | Status | Evidence |
|---|---|---|
| Allies left at war after the principal's ceasefire | **FIXED** (confirmed in the engine, not seen in play) | The ally card never fired in my runs. The US–Iran ceasefire came in month 2 of Scarborough (`philippines/log.txt`). The `tests/core/rc.spec.ts` case (Philippines goes home when the US makes peace) passes. |
| "Ally buckling" card while the ally was winning | **FIXED** | Pakistan is Saudi Arabia's ally. Its Chronicle ran "SAUDI ARABIA SMASHES THROUGH DEFENSES" and "MAKES SWEEPING GAINS", and no plea card appeared (`waterwar/log.txt`). |
| HUD growth vs falling GDP | **FIXED** | Philippines GDP went $500B → $516B with "Strong growth". Pakistan went $400B → $391B with "A shrinking economy erodes approval". The phone HUD now hides growth entirely. |
| Phone title panel covering the daily | **FIXED** | `00-title.png`: the daily is on the first screen and `elementFromPoint` lands on "Play today's crisis". |
| Share headline quoting my own decision | **FIXED** | `share-card.png` and the copied text show `"UKRAINE SMASHES THROUGH DEFENSES"`. See P2 below. |
| HUD overlap | **FIXED** | `daily/m03-picked.png`: seven clean stat columns and no clipping. |

Tally: 6 FIXED, 0 PARTLY, 0 NOT FIXED. The ally-exit fix is confirmed by the test, not by play.

## New or remaining issues
- **P1: "Too many requests" eats a turn on the phone.** My first daily attempt got a 429 from `/api/turn`. The toast sat on top of Execute (`daily/m05-desk.png`), the month didn't advance, and nothing retried. The limit is 4 per second per IP, and other testers on localhost shared it, so this is partly the test setup. Still, a player behind a shared IP (school, café, carrier NAT) would see a dead Execute button with a toast over it. Fix: retry automatically, and never cover the primary button.
- **P2: Following the advisors loses Pakistan.** Every month the Interior Minister said "Reform program: Mission: leadership score needs 82+… lifts it". I took it, and the score fell 100 → 79 in a straight line anyway. The Chronicle printed "SCORE 0.0" with no reason.
- **P2: Still too easy outside Brutal seats.** The daily ended with 0 close calls and an all-green grid, as in round 3. Scarborough reached B even with always-first-option play.
- **P2: Political capital sat at 6/6 from month 4 onward in all three runs.** Advisors only offer 1◆ courtships, so the cap wastes capital and nothing tells me.
- **P2: The briefing still repeats itself.** The italic paragraph is the mission box word for word, and neither lists the conditions (`daily/m01-ov0.png`).
- **P2: The share card's quote has nothing to do with me.** A Philippines card quotes "UKRAINE SMASHES THROUGH DEFENSES". After Copy text, the Share result button still says "Copied!".
- **P2: "at the helm of Philippines"** on the end screen is missing "the".
- **P2: The phone title header is cut off.** The account button is clipped at the right edge (`00-title.png`).
- **P2: "Strong growth lifts the national mood" ran every month** in both growing economies, 24 times in all.

## Scores
| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 7 | 7 | 7 | 6 | 7 | 7 |

**Verdict:** Yes, I'd recommend it for a commute. Every bug that annoyed me last round is gone. It's still too easy unless you pick a Brutal seat, and the advisors can steer you into a failure they never explain.
