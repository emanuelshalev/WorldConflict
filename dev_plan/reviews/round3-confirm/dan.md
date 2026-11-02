# Round 3 confirmation: Dan (grand-strategy veteran, 1440×900), 2.0.0-rc.1

Scripts, logs and screenshots are in `/tmp/claude-0/confirm/dan/`.

## What I played
- **UI, One Term, Turkey (Tough), Hard, 48 months.** Best crisis option by its arrows, plus reform, address, spy hunts, courting and denouncing: **A ★★★ "Master Diplomat"**, score 121, re-elected, 48 green months, 0 close calls.
- **UI, Legacy, Indonesia, Normal, 13 months.** Score 102 → 113.
- **API, 29 runs:**
  - 25 Hard Terms (TUR, BRA, PAK, EGY, POL, DEU, JPN): the literal address+reform loop, greedy domestic spending, and best crisis option with no orders.
  - 2 idle runs and two 120-month Poland Legacies.

## Previous issues
| Issue | Status | Evidence |
|---|---|---|
| P1: self-funding address+reform loop; capital never binds | **PARTLY** | Capital is a flat 2◆. The literal loop had 27–29 of its 48 reforms rejected, and my UI Term never hit the cap (0/48 months). But putting 2◆ a month into reform or address still gave **★★★ in 14 of 15 Hard Terms**, including "Brutal" Pakistan (legitimacy 100, approval 82). |
| P1: AI signed pacts without consent | **FIXED** | 1–6 `pact_offer` cards per Term, and no alliance ever appeared without one. |
| P1: previews ignored diminishing returns | **FIXED** (formatting bug) | Previews at 60% and 36% match the engine, including the −2 press penalty. In democracies it renders as **"Legitimacy +-1.6" in green**. |
| P1: collapse with no consequence | **FIXED** (slow) | No orders: TUR coup at month 34 (legitimacy 10, stability 0.7, two plot cards), PAK coup at month 40. Idle Brazil was **impeached** at month 44 after cards in months 25, 34 and 43, but legitimacy stayed under 10 for 9 months and at 0.0 for 2. |
| P1/P2: HUD growth vs actual GDP | **FIXED** | The HUD shows real growth (1.9% = `realGrowth` 1.90). Mean real growth vs. actual annualised GDP change: TUR 1.22/1.11%, POL Legacy 1.66/1.60%, PAK −2.09/−3.08% (smoothing lag). |
| Economic score flat | **NOT FIXED** | Over a Term it moves 1.5–4 points (TUR 25.4–28.2; POL 25.4–27.7 over **120 months**). The target is `20 + trend×450 + (real−trend)×120`, so beating trend by a point earns +1.2. There is still no economic order. |
| P2: court at relations 100 still costs 1◆ | NOT FIXED | Twice in my Term ("Relations 100 → 100"). |
| P2: no election on the end screen | PARTLY | The paper now runs "Erdoğan re-elected", but the end screen still says "you are still standing". |

## Dominant strategies and dead systems
- **The domestic sink.** Reform when you have 2◆, address at 3. That won 15 of 15 Hard Terms, 14 of them ★★★, with scores of 119–134. Other orders exist mainly to burn leftover ◆.
- **Best crisis option, no orders.** It won 6 of 10 Hard Terms (★★★ for EGY, DEU and TUR). POL lost both elections, and TUR and PAK fell to coups on seed 3. Pure idling loses (Brazil impeached, Pakistan couped by month 19).
- **How much the greedy wins bother me: moderately.** Reading the cards well *is* the game, so calm democracies surviving on good answers is fine. What bothers me more is that one option usually has the best arrow sum, and that **Egypt on Hard gets ★★★ with zero orders**.
- **Dead or near-dead systems:**
  - the economic score;
  - the defence budget (not retested; still logged as P2);
  - prestige, which decays steadily (Indonesia 24 → 20 in 13 months);
  - **the Legacy mid-game**: greedy Poland scored 130–133 from month 24 to month 120;
  - crisis cadence: 24 of 48 months with no card; in one Legacy the Belarus chain fired **17 times**.

## New issues
- **P1: pacts are free prestige.**
  - Signing gives legitimacy +1 and relations +10, and the prestige target adds +2 per pact (up to +8).
  - There's no player cap (AIs are capped at 4). NATO Turkey ended with **12 pacts**, adding Pakistan, Palestine, Sudan and Ethiopia, and none dragged me into a war in any run.
  - They earned me "Master Diplomat". Offers need downside and plausibility filters.
- **P2: the address preview shows "+-1.6" with the gain colour** (`preview.ts` `fmt`).
- **P2: the Chronicle's front page goes to routine orders.** "TURKEY: COURT GERMANY" led 23 of 48 months.
- **P2: Japan's economic score is pinned by debt** and can't be acted on, so its score goal is out of reach (greedy ★★, no orders ★).
- **P2: a crisis arrives after the vote.** "Ultimatum from Russia" landed in month 48, after the election.

## Scores
| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 6 | 7 | 7 | 5 | 4 | 5 |

**Verdict:** consent and consequence now work and the previews are honest, but one domestic button per month still beats Hard, and the economy remains a spectator.
