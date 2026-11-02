# Round 3: Dan (grand-strategy veteran, 1440×900)

Logs, scripts and screenshots are in `/tmp/claude-0/round3/dan/`.

## What I played
- **UI, One Term, Brazil (Tough), Hard, 48 months.** I weighed each crisis's arrows; orders were reform, address, spy hunts, courting the USA and China, and spying on and denouncing Venezuela. Result: **TERM_COMPLETED, A, ★★★, "Steady Hand"**. Score 115, exactly par; 48 green months, 0 close calls. About 70 minutes for a human.
- **UI, Legacy, Poland, Normal, 13 months.** Tusk re-elected in month 12; score 104 → 118.
- **API, 17 runs:**
  - 120-month Legacies as Poland.
  - 48-month Terms as Brazil, Pakistan (Hard) and Egypt (Hard) with fixed policies.
  - A Turkey→Syria war.
  - A/B runs of preview vs. result.

## Depth and strategy
- **Dominant loop: National address + Reform every month (3◆).** Above 70% approval you get the third pip, which pays for the orders that keep you above 70.
  - Pakistan ("Brutal") on Hard: stability 38→91, ★★★.
  - Egypt on Hard: stability 99.8, ★★★.
  - Poland Legacy: about 90/99 for 10 years, score flat at 134 from month 46.
- **Greedy crisis answers alone win.** The most-green option plus zero orders won as Brazil (61%), Pakistan on Hard (74%) and ★★ in the Poland Legacy. A national address every month (1◆) alone won ★★ on Hard.
- **Dead systems:**
  - **Defense budget.** 0.5%, 1.56% and 5% of GDP produced identical worlds through month 47. It costs 1◆ and has no UI button.
  - **Economic score.** Its target is `20 + growthRate×450`, and growth reverts to trend. With no economic orders, it sat at 24–27 in every run.
  - **Courting.** China sat on a −5/month treadmill, about 55 after 3 years of courting. The US stuck at 100, still costing 1◆ per court.
  - **Prestige.** It reads *their* relations to you and drifts 24 → 23 whatever you do.
- **Wars.** A 6.6:1 invasion of Syria pushed the front to 76, then ended in a ceasefire with no gain. Score 102→101.

## Economy and capital
| Brazil (UI) | M1 | M12 | M24 | M36 | M48 |
|---|---|---|---|---|---|
| Approval / Stability | 57/55 | 71/72 | 72/77 | 68/84 | 73/75 |
| GDP $B (HUD growth) | 2304 (2.1%) | 2329 (1.7%) | 2379 (2.3%) | 2357 (2.1%) | 2397 (1.7%) |
| Econ / Prestige score | 25/24 | 26/21 | 27/23 | 25/23 | 25/23 |

- **The slide is fixed, but growth is half what the HUD says.**
  - Poland's Legacy grew +15–20% over 10 years.
  - Brazil grew +4% in 4 years against about 2%/yr on the HUD.
  - The instability drag and shock losses never show.
- **World GDP is noisy.** In 4 years: Germany −22%, France −24%, UK +61%, Indonesia +69% (seed 3).
- **Capital binds for months 1–8 only.** Reform plus address forced choices early. After approval passed 70, I sat at 4–6◆ with nothing worth buying. Passive runs stayed at the 6◆ cap for **45–47 of 48 months**.

## Friction
- Orders that don't apply still appear: "Break pact Russia" with no pact, air strikes on nuclear powers in peacetime.
- The Chronicle buries the player:
  - "POLAND: COURT GERMANY" led while my own re-election sat at the bottom.
  - Headlines say "SILVA'S ANSWER", not Lula.
- Repetition: "Scandal engulfs Lula's inner circle" 4×, the US naval-base request 3×. 28 of 48 months had no crisis.
- A democracy's end screen never says you *won the election*: no vote share, no timeline entry.

## Bugs
1. **P1: AI alliances bind the player without consent.** In the Brazil Term, "United States and Brazil sign military pact" landed in month 13 with no card, then China in month 18. Brazil ended allied with both. Turkey (Legacy, seed 42, `war.js`) was pacted to Syria in month 1 and could then declare war on its own ally. The preview warned "Syria has defense pacts with Turkey" while I *am* Turkey. Cause: `proposeAlliance` auto-accepts when the target is the player.
2. **P1: The preview ignores diminishing returns.** Order a National address several months running. The preview says "Approval +4, Legitimacy +5", but the result is "36% effect" plus "press mocks your spin (legitimacy −2)".
3. **P1: Collapse has no consequence.**
   - Pakistan, Hard, seed 3, no orders: legitimacy 0.0 and stability about 9 for 15+ months at 74% approval; the Term ended ★★.
   - Brazil with no orders: approval 0.6 and legitimacy 0.0 for months 40–47, no impeachment card.
4. **P2: The defense-budget order is a no-op** below 5% and still costs 1◆.
5. **P2: The HUD shows headline growth, not effective growth.** Shocks come with empty causes (Egypt month 14: GDP −2.2%; Poland month 13: stability −11).
6. **P2: Courting at relations 100** is accepted and charged 1◆.
7. **P2: No election event** in the Term timeline or on the end screen.

## Scores
| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 5 | 7 | 7 | 4 | 4 | 5 |

Previews and the Chronicle are clear. But I earned an A ★★★ on Hard with a heuristic, and "Brutal" Pakistan fell to two buttons.

## Top 3 changes
1. **Break the snowball.**
   - Remove the >70%-approval pip, or make reform diminish like addresses do.
   - Make stats revert harder above 80.
   - Give every crisis option a real cost.
2. **Make the economy a lever.**
   - Add stimulus, austerity and trade-deal orders with debt trade-offs.
   - Make the defense budget cost growth at any level.
   - Score realised GDP versus trend, and show effective growth and the cause of each shock.
3. **Consent and consequence.**
   - Pacts proposed to the player become crisis cards.
   - Legitimacy below 10 forces a coup or no-confidence card.
   - Previews include diminishing returns and side effects.
