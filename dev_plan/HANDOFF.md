# Handoff: release candidate 2.0.0-rc.2

**Branch:** `ccr-fc426113-gp9q7q`, built on top of `feat/engagement-overhaul` (at `0ca6569`). Fast-forward or merge it into `feat/engagement-overhaul`, and from there into `main`, when you're happy with it. `CHANGELOG.md` summarises the release.

State as of 2026-11-01:
- **Checks:** all tests pass (`tests/core/rc.spec.ts`, `round3.spec.ts`, `handoff.spec.ts` and the originals, including determinism). Backend and UI lint have no errors (the backend has 8 old Biome warnings). `npm run build` passes.
- **Reviews:** round 3 (four personas plus a UX expert plus two code reviews) is in `dev_plan/reviews/round3/`. `README.md` there maps every finding to its fix.
- **Status page:** `dev_plan/project_status.html` (tasks, timeline, decisions).

## Measured balance (rc.2)

**Term**, 36 games per seat:

| | USA | UKR | ISR | TWN | DEU | Pooled | Avg ★ | Target |
|---|---|---|---|---|---|---|---|---|
| Smart | 94% | 83% | 89% | 97% | 81% | **89%** | 2.35 | 70–95 |
| Loop (reform/address) | 100% | 78% | 39% | 100% | 92% | 82% | 1.90 | - |
| Greedy (no orders) | 8% | 0% | 6% | 61% | 58% | 27% | 0.35 | - |
| Random | 0% | 0% | 0% | 36% | 42% | **16%** | | 15–45 |
| None | 0% | 0% | 0% | 0% | 0% | **0%** | | ≤20 |

- Iran (exempt, labelled Brutal) is 0–3%.
- Tension: median 45–57, with no months at 80+.

**Flashpoints**, all 22 seats, 24 games each:
- Smart: 67–100%, **92%** pooled.
- None: **0%**.
- Random: **15%**.
- Loop: 71%.
- Tension: medians 55–72, with at most 21% of months at 80+.

Every band is met.

**Confirmation playtests, recommend scores:**
- **rc.1:** Maya 7, Priya 7, Leo 6, Dan 5.
- **rc.2 re-check:** Dan 6.

Every persona is now at 6 or above (criterion 3). After Dan's rc.2 re-check, the statecraft goal was redesigned:
- at war, make peace and rebuild ties (+30 by the end);
- otherwise, the most *reachable* real rival;
- with no real rival, a strategic partnership with a natural partner.

So it is no longer trivial, free or impossible depending on the country. Term (24 games per seat, core five): smart 88% at 2.3★ average, the loop 83% at 1.9★, random 18%, none 0%.

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

## Done in the release-candidate loop

- **Economy and capital:** flat 2◆ capital (3 in Flashpoints), threat-capped defence budgets, oil shocks only from new wars, real growth everywhere it is shown or scored, and war damage by geography and economic reach.
- **Round-3 personas and UX:** every P0 and P1 fixed; see `dev_plan/reviews/round3/README.md`.
- **Flashpoint score targets recalibrated:** −3 across the board, because the economic score now counts real damage. China in Quarantine was kept at 120 so passive play doesn't win. Approval goals were set to 80 for the UAE in Bab al-Mandab and 66 for the US in Quarantine.

## Next work, in order

### P1
1. **Crisis-option payouts and "greedy" play** (see above). Make orders matter in calm democracies' Terms, for example with options whose upside requires a follow-up order, or approval rewards tied to policy, not to cards.
2. **Iran Term** stays near-unwinnable (3%) since collapse shields fail below 10 legitimacy. Either accept it as a challenge seat or give the regime a path back (concessions to the street, a negotiated embargo relief).

### P2
1. The defence-budget order barely matters (Dan). Courting at extreme lows barely moves relations, and prestige decays steadily.
2. Tab order: add a skip link, and an Enter shortcut for Execute.
3. Small number mismatches (save list "month 0" vs HUD "month 1").
4. Odd coup-card arrows; a refugee card with Israelis fleeing to Egypt; Russia striking Turkey's young programme provokes no reaction.
5. A nuclear escalation path for chaos players without an existing war.

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
