# Call balance, before the D-84 revision (baseline)

Measured by the Engine Engineer on `build-your-call` at 41c7b34 (after the merge of `dev/rc1-synthetic-loop`), before any change from `decision-call-balance.md`. Command: `node scripts/seats.mjs 36 staff,guided,callpush,callhold,smart,none` (the per-seat harness, moved from `.scratch/seats.mjs`). Seeded harness: rerunning on the same commit gives the same table.

## Arithmetic check of the proposal (section 2.2)

| | callpush | callhold | push minus hold |
|---|---|---|---|
| Recorded in exemptions.json (before the merge) | 83.2% | 71.2% | 12.0 |
| Measured, 21 seats | 82.6% | 71.1% | 11.5 |
| India alone | 6% | 100% | -94 |
| Other 20 seats | 86.4% | 69.7% | 16.8 |

The proposal's reading holds: India hides the gap rather than causing it (other 20 seats 16.8 points apart; proposal 17.3 from the pre-merge record). Guided India is 6%, as the proposal inferred; staff India (every call skipped, the engine default Covert) wins 56%.

21 flashpoint seats, 36 games per seat and policy.

| policy | pooled win | stars | months at the cap | call months |
|---|---|---|---|---|
| staff | 18.2% | 0.41 | 75.0% | 97.9% |
| guided | 81.8% | 1.97 | 32.6% | 84.6% |
| callpush | 82.6% | 2.00 | 31.1% | 84.6% |
| callhold | 71.1% | 1.59 | 28.9% | 88.2% |
| smart | 74.0% | 1.75 | 37.0% | 0.0% |
| none | 0.3% | 0.00 | 100.0% | 0.0% |

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
| quarantine:CHN | 89% | 97% | 97% | 56% | 100% | 3% |
| quarantine:USA | 0% | 47% | 47% | 8% | 31% | 0% |
| scarborough-line:PHL | 44% | 100% | 100% | 100% | 100% | 0% |
| scarborough-line:CHN | 56% | 100% | 100% | 100% | 100% | 0% |
| water-war:IND | 56% | 6% | 6% | 100% | 0% | 0% |
| water-war:PAK | 31% | 100% | 100% | 94% | 81% | 0% |
