# Round 3 re-check: Dan (grand-strategy veteran, 1440×900), 2.0.0-rc.2

Logs: `/tmp/claude-0/recheck/dan/`.

## What I played
- **UI, One Term, Indonesia, Hard, 48 months.** Best crisis option, reform when stability or legitimacy was under 70, addresses before the vote, courting China, the US and the goal target, spy hunts. **A ★★★ "Pragmatic Stabilizer"**, score 129, economy component 37, re-elected, 48 green months.
- **API, 45 Hard Terms** on TUR, BRA, POL, EGY and PAK (seeds 3 and 11), with these policies:
  - the literal address+reform loop (10 runs);
  - greedy reform (10);
  - best crisis option with no orders (10);
  - the loop plus courting the statecraft target (10);
  - a "diplomat" policy that courts the target and picks the de-escalating crisis options (5).
- **Pact probes:** two 40-month Legacies (IDN, BRA), plus Israel courting the US past 95 while at war.

## Previous issues
| Issue | Status | Evidence |
|---|---|---|
| P1: one domestic button gives ★★★ | **PARTLY** | The loop and greedy reform now give **★★★ in 4 of 20** runs (was 14 of 15), and all 4 are Pakistan, whose inherited war with Afghanistan ends by itself in months 3–9 even with zero orders. They win 18 of 20, 14 of those at ★★. Adding cheap courting gives **★★★ in 6 of 10**: Turkey with 7–11 courts of Israel, Brazil with 3–8 courts of *Afghanistan*, and Pakistan for free. |
| Reform: diminishing returns, long-run growth | **FIXED** | Monthly reform runs at 80/64/51/41% and then 33% effect. The trend rises 1.5–2.0 points to its cap: TUR 2.55→4.20%, EGY 2.98→5.00%. Real growth at month 48 is 3.5% for TUR (against 1.6% with no orders). |
| Economic score flat | **FIXED** | Greedy reform ends at 29.5–36.7 (mean 33.0). No orders ends at 21.1–30.1 (mean 26.4), and a war drags it down (Pakistan 21.1). In rc.1 it moved only 1.5–4 points. Reform is still the only lever. |
| Best crisis option, no orders | **PARTLY** | It wins **6 of 10** (unchanged), but with **0 ★★★** (was 3), 4 ★★ and 2 ★. Losses: TUR coup in month 41, PAK coups in months 13 and 37, and POL lost the vote. **Egypt still wins ★★ with zero orders on both seeds.** |
| P1: pacts are free prestige, no cap | **FIXED** | Egypt stops at exactly 4 (SAU/SDN/PSX/ARE) and gets no more offers. Brazil reaches 2. Israel at war got 0 offers in 6 months. Pakistan's offer from China came only after its war ended. |
| P2: court at 100 costs 1◆ | **FIXED** | At 97 the order is refused. The preview shows it as `blocked`, and the UI shows a toast. |
| P2: "+-1.6" in the preview | **FIXED** | The preview now reads "Legitimacy -0.2". |
| P2: no election on the end screen | **NOT FIXED** | The paper ran "Prabowo Subianto re-elected", but the end screen still says "you are still standing". |
| P2: routine orders lead the Chronicle | **NOT FIXED** | "INDONESIA: COURT CHINA" and similar routine orders led 18 of 48 months. |

## New issues
- **P1: the statecraft goal is a lottery, not a choice.**
  - **Trivial:** countries with no historical rivals fall back to the first country at relations 0, alphabetically. Indonesia and Brazil got "Mend ties with Afghanistan (0 → 20+)", done in 3 courts by month 3.
  - **Automatic:** Pakistan's inherited war ends on its own.
  - **Impossible:**
    - Egypt and Ethiopia: Egypt gains +7 from each court, then loses about 14 by the next month, and stays pinned at −99 even when it picks hotline and negotiation options.
    - Poland and Russia: relations oscillate between −50 and −70. The goal is judged in the last month only, so Poland met it 3 times mid-term and still lost the star.

  Only Turkey's goal needs real, sustained foreign policy.
- **P2: the reform preview always says "Growth trend +0.15 pts"**, even at 33% fatigue or when the trend is already at its cap (`preview.ts:489`).
- **P2: implausible pacts.** Non-aligned Indonesia signs with China, and Egypt with Palestine and Sudan. Offers are all upside (legitimacy +1, relations +10, prestige up to +8). Capital still has one sink, reform, and the defence budget and prestige remain near-passive.
- **P2: `DIPLOMACY_MEDIATE`** (2◆) is in the desk but missing from `docs/API.md`.

## Scores
| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 6 | 7 | 7 | 6 | 5 | 6 |

**Verdict:** the economy finally responds and pacts behave, but the third star is handed out by the seat you pick, not earned through statecraft.
