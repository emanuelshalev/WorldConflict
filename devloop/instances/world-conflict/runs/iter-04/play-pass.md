# Play pass, iteration 4: "Your call"

Owner: Game Designer. Build: `dev/rc1-synthetic-loop` at 7fe4457 (no engine change since cf95a1f). No game code changed, nothing committed. Scripts and raw data: `runs/iter-04/play-pass/` (`calls.ts`, `analyze.mjs`, `probe.ts`, `probe-c4.ts`, `hand.ts`; `analysis-36seeds.txt`, `seats-36.md`).

## Verdict

**Not met.** For the player who makes the calls (the Chief of Staff pick, which is what Guide me and the setting play), **63.3%** of months 2 to 12 hold at least one real decision, pooled over all 21 seats. That is 16.7 points short of 80%. Even the docs' own looser test (criterion c, the engine's `trade` flag) gives 78.1%, still short. The months go empty late: 98% in month 2, 80% in month 4, 60% in month 6, 42% in months 11 and 12. Once the mission goals are on track, the desk stops asking. A player who is losing still gets asked every month (98.7% when every call is skipped), so the gap hits the players who are doing well.

## Definition used

The decision docs (decision-accept-all.md 6.2 c and j) define a real decision as a call with two answers where neither is at least as good as the other on primary goals, bonus goals, capital, odds and home front (`isTrade`). That leaves room in three places: it counts a pair of answers nobody recommends, it ignores what leaving the call does, and it ignores the price the engine drops on a default answer. So the headline uses the stricter test from the brief, and the docs' test is shown beside it. A call is real when:

- (a) material: two available outcomes differ on goal labels, or on the home front by 6 or more;
- (b) no dominant answer: no outcome (cards that are not blocked, plus leaving it) is at least as good as every other on primary goals, bonus goals, capital, odds and home front; and it is not true that the advisers agree on one card that is also best on goals;
- (c) leaving is priced honestly: before the deadline month "leaving" is a free outcome with no effect (the desk says so, `leaveText`); from the deadline month it is the engine default without the D-84 price (`turn.ts` charges no price on a default).

A month counts when at least one call passes.

## Method

`calls.ts` plays every flashpoint seat (all 21; the default seat is `playable[0]`) for 12 months on 36 seeds, using `DataLoader.newGame`, `TurnEngine.executeTurn`, `generateDeterministicIntents` and `buildAdvice`, the payload `/api` returns. On top of Accept all (the routine) it plays four rules: **chief** (the Chief of Staff pick on every call), **contra** (the first card nobody recommends, else the first card that is not the mission card; Hold on the mission move), **staff** (every call left open) and **chiefskip1** (chief, but the month 1 calls left open). Each month it records the open calls, every card's advisers, goal labels, capital and price, the Guide me line, what leaving does, and the verdict. The harness was also run at 36 games (`scripts/seats.mjs`) and reproduces `call-balance-after.md` exactly.

## Numbers (36 seeds, months 2 to 12, "chief")

| Flashpoint | Seats | Real decision | Engine trade (docs) | Any call | Month 1 real |
|---|---|---|---|---|---|
| Bab al-Mandab burning | SAU, YEM, ARE | 59.1% | 71.3% | 84.3% | 108/108 |
| Caracas after Maduro | VEN, CUB, USA | 58.6% | 77.4% | 85.9% | 108/108 |
| Ceasefire or collapse | UKR, RUS, USA | 70.8% | 86.5% | 92.6% | 108/108 |
| Fire on the Nile | SDN, EGY | 63.0% | 70.4% | 81.6% | 72/72 |
| Hormuz convoy | USA, IRN, ARE | 72.8% | 83.1% | 87.0% | 72/108 |
| Quarantine | TWN, CHN, USA | 74.5% | 92.3% | 93.7% | 108/108 |
| Scarborough Line | PHL, CHN | 34.6% | 48.5% | 59.2% | 72/72 |
| Water war | IND, PAK | 63.3% | 86.6% | 92.4% | 72/72 |
| Default seats only | 8 seats | 69.7% | 85.7% | 91.4% | 288/288 |
| **Pooled** | 21 seats | **63.3%** | **78.1%** | 85.4% | 720/756 |

- Real decisions per month: 0.84 (docs' trade test: 1.14; the 1.0 mean of criterion j holds only on the looser test).
- Other rules: staff 98.7%, contra 97.4%, chiefskip1 65.6%. Losing players are always asked something.
- Seats under 50%: Scarborough China 15%, Egypt 29%, Bab al-Mandab UAE 36%, Taiwan 48%, Russia 49%. Seats over 90%: Sudan 97%, Hormuz USA 96%, Quarantine China 92%, Ceasefire USA 91%.
- Month 1: 720 of 756 games have a real decision. The 36 without one are all Hormuz Iran: "Answering Washington" is the only crisis, every goal is already on track, and there is no call at all.

**Where the empty months come from (2,998 months):**
- 1,189 have no call at all. The crises are routine and no order on offer pushes a goal.
- 1,809 have only crisis calls that fail. 2,216 calls have one dominant answer, and in 1,350 more the advisers agree on the card that is best on goals.
- No empty month has a mission move. Every mission move passed the test.
- When all primary goals are on track (50% of months), only 50% of months are real, against 77% when a goal is behind. Goals are on track from month 1 or 2 in every game for Yemen, Pakistan, Iran, Taiwan, the Philippines and Venezuela.

Typical failing calls:
- "General strike": "For your mission: Meet their demands" (free, +6 home front) against a calm card that costs 2 and gives +3.
- "United States' offer": Sign it (free) against Renegotiate (1 capital, same goal).
- "Hostages in Yemen": the mission card helps no goal and costs 1. The calm card is free and just as good.

## Known open items, checked

| Item | Holds? | Numbers |
|---|---|---|
| Leaving the month 1 call costs nothing | **Holds** | 720 of 720 month 1 crisis calls are free to leave. Every crisis call from month 2 on applies its default when left (0 of 6,480 free). Leaving month 1 open, then playing the Chief, wins 86.9% (2.13 stars), against 85.4% (2.05) when month 1 is answered. Leaving is not just free, it is slightly better. |
| Scarborough Line too easy | **Holds** | Philippines: every primary goal is on track from month 2 in 36 of 36 games under every rule. The contrarian wins 100%, and staff (every call skipped) 44%. China: 100% for chief, guided, callhold and smart. Real-decision months: China 15%, Philippines 54%. Capital sits at the cap of 6 from about month 7. |
| C2-1: setting on, Hormuz month 1 has two "Recommended" answers | **Holds** | 36 of 36 seeds. The bank is 3 and Reply via Muscat costs 1, but the Chief takes More escorts: the budget comes after the unaccepted Reform program (2) and the meetings. Over all games the Chief takes the calm card while the bank could pay the mission card in 233 of 4,944 two-sided crisis calls (Hormuz USA 50, Yemen 50, Ukraine 49, Taiwan 22). On the mission move the Chief holds while the bank could pay in 1,630 of 4,638 calls. |
| C-4: Taiwan relations fall 9 in month 1 with no move | **Holds, and is worse** | 3 seeds: -80 goes to -98.2, -86.5 and -89.4. Taiwan's AI deploys to the border every month and sometimes denounces China, and Japan denounces too. The month report shows the Taiwan line in 1 of 3 seeds (`yourView`). Waiting ends at -98, not the -71 estimated. With the Chief's courting, China wins 80.6%. |
| Call gap 15.5 against 15 | **Holds** | Re-run at 36 games: callpush 86.3%, callhold 70.9%, gap 15.4 (15.5 unrounded). Informative, 0.5 over. |

## Three months by hand: Hormuz convoy, United States, seed 1000

- **Month 1.** The January clock: strike the IRGC navy, more escorts, or reply via Muscat. This is a good call. Muscat moves the main goal ("The shooting stops") and costs voters and 1 capital. The strike helps voters and the bomb goal but hurts the war goal and the Gulf. With National address at 1 and the routine Reform program at 2, the bank of 3 cannot pay for everything, so I felt the trade. But two things are off.
  - The Chief of Staff's card, More escorts, says "puts no goal at stake" while its own tag says it hurts Voters stay on side.
  - Leaving the call open costs nothing this month, and the desk says so.
  - I chose Muscat and the address. Approval still fell from 44 to 40.
- **Month 2.** Iran nears the threshold. Every answer hurts "The shooting stops", and the calm card again says "puts no goal at stake". The stakes are legible: strike for the bomb goal and voters, or talk. I struck, and the report says the program is crippled. There was no mission move this month even though voters is the step, so the month was one question deep.
- **Month 3.** Incident with North Korea. "For your mission: Condemn publicly" costs 1 capital (price), but Condemn is also the default, and leaving it open gives the same answer for free. I left it open. The report says "Condemn publicly (no decision taken)" and no capital went. The "To keep things calm" card is Reinforce and shadow them (tension +6). The quiet de-escalation has no backer. This month taught me to skip the call.
- **Month 4 (peek).** "Your advisers agree on Full convoy operation". It is obvious, so I clicked it.
- **Overall.** Month 1 asks a real question. After that the questions get thinner or teach the wrong habit. In 432 Hormuz USA months no card ever offers a ceasefire, though ending the war is the first goal.

## Defects

**S1 (blocks publishing iteration 4)**

1. **S1-1: a call says something untrue.** The calm card's reason "It keeps the country steady and puts no goal at stake." appears on cards that hurt or break a goal. That is 1,165 of 4,944 two-sided calls (1,089 on a primary goal), in 12% of months, including month 1 of the default Hormuz game every time. Cause: `src/core/advisors.ts` line 1097 tests only "helps none".
   - Proposal, iteration 4 (text only, small, safe): when the calm card hurts or breaks a goal, say "The steadier answer; it costs <goals>."
   - Check `npm run bench:reveal` only if advisors text is in the fingerprint.

**S2 (serious)**

2. **S2-1: D-84 play-pass target not met.** 63.3% against 80% (78.1% on the docs' test). It collapses after month 5 and on seats whose goals start on track.
   - Proposal, iteration 5: when every primary goal is on track, the mission move offers the bonus goal or a "secure the lead" order with a named risk, and authored crises carry stakes for kept goals.
3. **S2-2: leaving a priced mission card gets it for free.** When the default answer is the mission card (553 of 6,480 crisis calls in months 2 to 12, for example North Korea, "Grid down", "Gaza: famine warnings"), Skip runs the same answer without the D-84 price. A careful player learns to skip.
   - Proposal, iteration 4 if one harness re-run is allowed, else 5: no price on the answer that is the engine default (`itemPrices` in `missionImpact.ts`).
4. **S2-3: leaving the month 1 call is free and slightly better** (86.9% against 85.4%).
   - Proposal, iteration 5: opening crises resolve on their default in month 1 when left (deadline of turn 0 for opening and scripted month 1 crises), and the desk says so.
5. **S2-4: Scarborough Line is too easy and nearly decision free** (Philippines goals on track from month 2 under any rule, the contrarian wins 100%, China 15% real months).
   - Proposal, iteration 5 (content): a goal that needs a move, as done for Quarantine China (D-85).
6. **S2-5: C2-1, the Chief's budget counts staff proposals the player has not accepted.** The Chief picks the calm card or holds while the bank could pay (233 crisis calls, 1,630 moves).
   - Proposal, iteration 5 with the month screen: budget the calls before the upkeep orders (advisors.ts about line 1306), and show one recommendation per call with its reason.
7. **S2-6: "For your mission" names a card that helps no goal** in 1,233 of 4,944 calls, and in 174 the calm card is strictly better ("Hostages in Yemen").
   - Proposal, iteration 5: a crisis whose mission card helps no goal is routine (or the guide line says "least harm").

**S3**

8. **S3-1: C-4.** Taiwan's border deployments cost China 6 to 18 points in month 1, and the report hides it in 2 of 3 seeds.
   - Proposal, iteration 5: always list mission-target relations in `yourView`.
9. **S3-2: "To keep things calm" can be the escalating answer** (North Korea: Reinforce, tension +6) while the de-escalating one is unbacked.
   - Proposal, iteration 5: rank calm by tension first.
10. **S3-3: the same adviser recommends a mission order and Hold this month** in 766 of 4,638 mission moves (`holdBy` checks only the first card).
    - Proposal, iteration 4 (small): pick Hold's adviser from all cards.
11. **S3-4: Hormuz convoy, Iran month 1 has no call in 36 of 36 games.**
    - Proposal, iteration 5: give the seat an authored opening call.
12. **S3-5: Hormuz convoy USA never sees a ceasefire card** in 432 months, though "The shooting stops" is the first goal.
    - Proposal, iteration 5: offer the ceasefire proposal as a mission move while the war runs.
13. **S3-6: the engine's `skip.text` ("The cabinet waits: X. It costs ...") is wrong before the deadline month.** The UI does not show it for crises, but the API carries it.
    - Proposal, iteration 4 (small): mirror `leaveText`.
14. **S3-7: call gap 15.5 against 15.** Informative. Review with the iteration 5 state-aware policy as planned.

In iteration 4 (small, safe): S1-1, S3-3, S3-6, and S2-2 if re-measured. Everything else goes to iteration 5.
