# Handoff — engagement overhaul, round 3

**Branch:** `ccr-fc426113-gp9q7q`, built on top of `feat/engagement-overhaul` (at `0ca6569`). Fast-forward or merge it into `feat/engagement-overhaul` when you're happy with it.

State as of 2026-11-01: every round-2 P0, P1 and P2 handoff item is done.
- **Checks:** 103/103 tests. Backend lint and UI lint have no errors (the backend still has its 8 old Biome warnings). `npm run build` passes.
- **Where things are:** plan, tasks, blockers and decisions are in `dev_plan/project_status.html`. Reviews are in `dev_plan/reviews/`.
- **Tests:** this round's tests are in `tests/core/round3.spec.ts`; round 2's are in `tests/core/handoff.spec.ts`.

## Release-candidate criteria

A build is a release candidate when all of these hold:

1. **Checks:** `npm test`, both linters (no errors), `npm run build`, and the determinism spec all pass.
2. **Balance:** Term (36 games per seat) and every flashpoint seat (12 games, 36 for any seat near a band edge) meet the targets: smart 70–95% pooled with no seat below 65%, none ≤20%, random 15–45% pooled, tension median 45–70 with ≤20% of months at 80+. Iran's Term is exempt as a deliberately brutal seat.
3. **Playtest:** a four-persona UI playtest (Maya phone casual, Priya geopolitics expert, Dan long-game strategist, Leo chaos player) finds no P0 or P1 issue left unfixed, and no persona's "recommend" score is below 6.
4. **Review:** an independent code review of the release diff finds no unfixed correctness bug.
5. **Docs:** README, `docs/` and the status page describe the build, and a `CHANGELOG.md` entry exists.

## Done in round 3

| # | Item | Where |
|---|---|---|
| 1 | **Denounce was a free approval pump.** It cost 0◆ and gave +2 approval whatever the target. Now: +2 against an adversary, halving with each repeat in 6 months; −2 against a partner; 0 against a bystander. The preview and turn report show the real effect. | `systems/diplomacy.ts` `denounceApprovalDelta`, `turn.ts`, `preview.ts` |
| 2 | **Incumbency fatigue:** −5 on the election score after 36+ months in office. | `systems/government.ts` `holdElection` |
| 3 | **Real 2026 election dates.** The scenario field `nextElection: "YYYY-MM"` covers 27 countries. Ukraine, Venezuela, Israel and Denmark stay staggered. In Term mode the player's own election is still pinned to the end. | `data-loader.ts` `monthsUntil`, `data/scenarios/2026.json` |
| 4 | **Spy hunts work.** *Hunt foreign spies* foils 60% of foreign operations against the player for 3 months. The advisor recommends it when the monthly report shows meddling. | `turn.ts` (`counterIntelUntil`), `preview.ts`, `Desk.tsx` |
| 5 | **Peace on the winner's terms.** At 65+ on its side of the front, the winner may accept a ceasefire. The loser pays −6 approval / −5 legitimacy (a defeat costs −15/−20/−15 plus reparations); the winner gains +5 / +3. This applies to AI wars too. | `systems/diplomacy.ts` `ceasefireChance`, `proposeCeasefire` |
| 6 | **`trendGrowth` override.** Iran's −5% wartime contraction was also its structural trend: with the war and embargo drags on top, it shrank about 13% a year forever. Its trend is now +1%. | `data-loader.ts`, `data/scenarios/2026.json` |
| 7 | **Tension.** Each standing border deployment added 0.5 tension every month with no cap (6–7 a month in 2026). Standing garrisons now add 0.15 each, at most 1.5 a month. | `systems/military.ts` `applyBorderTensions` |
| 8 | **Phone and HUD.** Short-label numeric stats on phones, sticky Execute with the chosen crisis answer, a layout-aware first tip, the desktop tension bar visible again, and map zoom moved out from under the mission chip. | `Hud.tsx`, `Desk.tsx`, `wc.css`, `MapView.tsx` |
| 9 | **Share card PNG:** score, month, closing headline, daily date, and a strip with one segment per objective. | `EndScreen.tsx` `drawCard` |
| 10 | **Text and data:** a `possessive()` helper ("United States'"), "A warship from X", no famous-name mash-ups, successors never share the outgoing leader's surname, the scripted missile event never fires for the player's country, and the dossier says "in power before your term". | `src/core/text.ts`, `crises.ts`, `government.ts`, `events.ts`, `CountryDetailPanel.tsx` |
| 11 | **Persona round 3 fixes.** Advisors now back primary *score* goals by fixing the weakest component; a suggestion leaves the desk once its order is queued; a pact war joined through a crisis answer earns "Loyal Ally", not "Warmonger". | `Desk.tsx`, `turn.ts` (record key `DIPLOMACY_DECLARE_WAR:ally`), `scoring.ts` |
| 12 | **Data tuning:** the Caracas US approval goal goes from 60 to 55, because 60 sat at the median of final approval. | `data/flashpoints/caracas-after-maduro.json` |

## Measured balance

**Term**, 36 games per seat (USA, UKR, ISR, TWN, DEU):

| | Smart | Random | Target |
|---|---|---|---|
| Pooled | 95% | 15% | smart 70–95, random 15–45 |
| Taiwan | 100% | 31% (was 100%) | |
| Germany | 83% | 31% (was 75%) | |

- No orders: 0% on every seat.
- Iran (12–36 games): smart 17–33%, none and random 0%. It was 0% for every policy. Iran stays the hardest seat on purpose (decision D-29).
- Tension: median 46–58, with 0% of months at 80+.

**Flashpoints**, all 22 seats, 12 games each:

| | Win rate | Tension median | Months at 80+ |
|---|---|---|---|
| Smart | 75–100% on 21 seats; one at 58% (see below) | 56–71 | 0–18% (was up to 80%) |
| No orders | 0–17% (pooled 1%) | | |
| Random | 0–50% (pooled 13%) | 61–73 | |

- The two US seats at Caracas and Quarantine are noisy at 12 games; over 36 games both win 69%.
- Flashpoint tension medians were 72–85 before this round.

**Persona round 3 (focused):**
- **Maya** (phone, Quarantine as Taiwan, following advisors): 3 of 3 runs won after the fixes (2 of 3 before).
- **Leo** (warning flow): coups and revolutions are telegraphed 86–100% of the time.
- **Dan** (long game): see P1 #1 and #2 below.

## Next work, in order

### P0
1. **A full four-persona UI playtest** on this build. Round 3 drove only Maya through the UI; Leo and Dan were checked through the harness, and Priya wasn't run.

### P1
1. **Political capital isn't a constraint.** A light-touch player sits at the 6◆ cap in 47 of 48 months (Dan's complaint in both rounds). Options: a lower base income, costlier reform, or decay of banked capital. Retune with the harness afterwards; every policy will shift.
2. **Long-game GDP drifts down.** In peaceful Terms with default crisis answers, GDP falls 2% for Germany and 6% for Pakistan over 48 months, even though monthly growth reads positive. Check the instability and military-budget drags in `effectiveGrowth` against each country's trend.
3. **US approval goals are on a knife edge.** In Caracas and Quarantine, smart play wins 69% over 36 games, and final US approval clusters around the goal. Consider retuning, or give the US player an approval lever tied to the mission.

### P2
1. A nuclear escalation path that chaos players can use without an existing war (Leo's review).
2. Minor items from the review: Escape doesn't close Settings; a duplicate-key warning in the ticker; a map glyph 404 for the emoji range; the phone tip box is cramped beside its dismiss button; Pakistan and Turkey are labelled AUTOCRACY yet hold elections (a "hybrid regime" label would read better).
3. The advisors' prestige suggestion can pick an odd partner (Taiwan courting North Korea at −29). Restrict it to countries that aren't historical rivals.

## How to verify
```bash
npm install && (cd ui && npm install) && npx prisma generate && npx prisma db push
npm test && npm run lint && (cd ui && npm run lint) && npm run build
npm run sim -- --scenario 2026 --mode TERM --countries USA,UKR,ISR,TWN,DEU --games 12 --policy smart,none,random
for each flashpoint: npm run sim -- --flashpoint <id> --scenario 2026 --countries <seats> --games 12 --policy smart,none,random --why 1
```
- Use `--games 36` for any seat near a band edge: 12-game rows swing by ±15 points.
- A fresh clone needs `npx prisma generate` before `npm test`.

Balance targets: smart 70–95%, none ≤20%, random 15–45%. Tension median 45–70, with ≤20% of months at 80+.
