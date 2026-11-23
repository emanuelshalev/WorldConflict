# Call balance, after the D-84 revision

Measured by the Engine Engineer on `build-your-call` after e650703 (India classification, smart penalty, directional bands, Quarantine China goal). Command: `node scripts/seats.mjs 36 staff,guided,callpush,callhold,smart,none`. Baseline: `call-balance-before.md`.

## Step by step (pooled over 21 flashpoint seats, 36 games each)

| policy | before | India fix (6bc04e4) | + smart penalty (d867e41) | + Quarantine China (e650703) |
|---|---|---|---|---|
| staff | 18.2% | 18.2% | 18.2% | 14.0% |
| guided | 81.8% | 86.3% | 86.3% | 85.5% |
| callpush | 82.6% | 87.1% | 87.1% | 86.3% |
| callhold | 71.1% | 71.1% | 71.1% | 70.9% |
| smart | 74.0% | 74.0% | 78.7% | 78.4% |
| none | 0.3% | 0.3% | 0.3% | 0.1% |
| callhold minus callpush (call-trap, max 8) | -11.5 | -16.0 | -16.0 | -15.4 |
| callpush minus callhold (call-gap, informative, target 15) | 11.5 | 16.0 | 16.0 | 15.4 |

Seats that moved: water-war India (guided and callpush 6% to 100%, smart 0% to 100%, callhold 100%, staff 56%) and Quarantine China (staff 89% to 0%, guided and callpush 97% to 81%, callhold 56% to 50%, smart 100% to 94%, none 3% to 0%). No other seat changed.

## Pass criteria (decision-call-balance.md 6.3)

| criterion | measured | result |
|---|---|---|
| India: callhold minus callpush at most 25 | 0 (100% and 100%) | pass |
| India: guided at least 65% | 100% | pass |
| China: staff at most 60% (target under 30%) | 0% | pass |
| China: none at most 20% | 0% | pass |
| China: smart at least 65% | 94% | pass |
| China: guided at least 65% | 81% | pass |
| Pooled smart 70 to 95% | 78.4% | pass |
| Pooled guided 65 to 90% | 85.5% | pass |
| Pooled staff at most 30% | 14.0% | pass |
| Guided months at the cap at most 45% | 32.2% | pass |
| call-trap: callhold minus callpush at most 8 pooled | -15.4 (the band spec, on unrounded seat rates: -15.5) | pass |
| call-trap-seat: no seat above 25 | largest is 0 (no seat where callhold beats callpush) | pass |
| calm-floor: callhold at least 65% | 70.9% | pass |
| push-ceiling: callpush at most 90% | 86.3% | pass |
| call-gap (informative): target 15 or less | 15.4 (band spec 15.5) | over target, informative, not blocking |

## Final per-seat table

21 flashpoint seats, 36 games per seat and policy.

| policy | pooled win | stars | months at the cap | call months |
|---|---|---|---|---|
| staff | 14.0% | 0.29 | 74.9% | 99.2% |
| guided | 85.5% | 2.05 | 32.2% | 86.4% |
| callpush | 86.3% | 2.09 | 30.8% | 86.3% |
| callhold | 70.9% | 1.58 | 27.7% | 89.5% |
| smart | 78.4% | 1.84 | 39.2% | 0.0% |
| none | 0.1% | 0.00 | 100.0% | 0.0% |

| seat | staff | guided | callpush | callhold | smart | none |
|---|---|---|---|---|---|---|
| bab-al-mandab-burning:SAU | 0% | 36% | 36% | 28% | 53% | 0% |
| bab-al-mandab-burning:YEM | 28% | 92% | 92% | 86% | 100% | 0% |
| bab-al-mandab-burning:ARE | 0% | 100% | 100% | 97% | 72% | 0% |
| caracas-after-maduro:VEN | 0% | 100% | 100% | 97% | 100% | 0% |
| caracas-after-maduro:CUB | 11% | 100% | 100% | 89% | 97% | 0% |
| caracas-after-maduro:USA | 0% | 97% | 97% | 69% | 42% | 0% |
| ceasefire-or-collapse:UKR | 14% | 92% | 94% | 72% | 92% | 0% |
| ceasefire-or-collapse:RUS | 0% | 92% | 92% | 89% | 72% | 0% |
| ceasefire-or-collapse:USA | 0% | 56% | 56% | 42% | 44% | 0% |
| fire-on-the-nile:SDN | 0% | 83% | 89% | 39% | 69% | 0% |
| fire-on-the-nile:EGY | 0% | 100% | 100% | 100% | 92% | 0% |
| hormuz-convoy:USA | 0% | 89% | 92% | 81% | 97% | 0% |
| hormuz-convoy:IRN | 3% | 50% | 56% | 36% | 64% | 3% |
| hormuz-convoy:ARE | 0% | 81% | 81% | 11% | 47% | 0% |
| quarantine:TWN | 50% | 100% | 100% | 100% | 100% | 0% |
| quarantine:CHN | 0% | 81% | 81% | 50% | 94% | 0% |
| quarantine:USA | 0% | 47% | 47% | 8% | 31% | 0% |
| scarborough-line:PHL | 44% | 100% | 100% | 100% | 100% | 0% |
| scarborough-line:CHN | 56% | 100% | 100% | 100% | 100% | 0% |
| water-war:IND | 56% | 100% | 100% | 100% | 100% | 0% |
| water-war:PAK | 31% | 100% | 100% | 94% | 81% | 0% |

## Balance bands at 36 games

`BALANCE_GAMES=36 npx vitest run -c vitest.balance.config.ts`: 8 of 8 tests pass, no FAIL line. Smart pooled 92.3% on the representative seats (Term five, three flashpoint seats; Iran's Term exempt at 0%), tension median 56, months at 80+ 1.1%, staff pooled 14.0%, guided 85.5% with 32.2% of months at the cap, call trap -15.5 pooled, largest seat call trap 0 (Egypt, Taiwan, both Scarborough seats, India), callhold 70.9%, callpush 86.3%, call gap 15.5 (informative), real decisions 1.18 a month. Random pooled 10.5% stays exempt (D-49).
