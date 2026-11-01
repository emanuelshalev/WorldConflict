# Round 3: Priya (IR grad student, 1440×900, plays for realism)

Screenshots are in `/tmp/claude-0/round3/priya/` (`<seat>-t<month>-{desk,chron,next,drawer,end}.png`).

## What I played (outcomes)
- **Bab al-Mandab Burning, Saudi Arabia (Tough):** Muscat channel, Perim talks, UN salaries. **Mission failed, D, ☆☆☆, score 115/117.** All other boxes ✓, both bonuses ✓ (`sau-t12-end.png`).
- **Quarantine, Taiwan (Brutal):** reflag, Japan's LNG, half budget, held fire. **Mission complete, A, ★★★** (`twn-t12-end.png`).
- **Ceasefire or Collapse, Ukraine (Tough):** referendum, Patriots, trainers, signed. **Mission complete, B, ★★☆, "Master Diplomat"** (`ukr-t12-end.png`).
- **Dossiers read:** Yemen, Iran, Pakistan, China, Japan, United States, Russia, Germany. I read all three debriefs.

## Realism wins
- **Real leaders now:** MBS, Lai Ching-te, Zelensky, Mojtaba Khamenei, Takaichi, Merz, al-Sharaa, Aoun, Akhundzada. This fixes round 2's biggest complaint.
- **Correct alliances:** the Saudi–Pakistan defence pact (Sept 2025) and the China–DPRK treaty are both there.
- **Crisis writing is excellent:** STC "dissolution" and the PLC; the KMT legislature killing the special defence budget; Takaichi's "survival-threatening situation"; the 28-point plan's free economic zone; the draft age kept at 25; the reassurance force.
- **Election dates:** Taiwan's local elections (28 Nov 2026) and the Nigeria, Italy and Poland 2027 votes all fall in the right windows.
- **Debriefs are accurate:** Strait Thunder-2025A, Justice Mission-2025, Russia's 2025 gains.
- **Unverified (after my knowledge cutoff):** the Houthis taking Mokha in Sept 2026 and the strike on Riyadh airport.

## Realism errors
| Item | Where | Why it's wrong | Sev |
|---|---|---|---|
| About 25 "mutual defense treaties" per run: US–Taiwan, Japan–Taiwan, China–Russia, Iran–Russia (twice), India–Japan, US–Mexico, UK–Japan, Brazil–South Africa | Chronicle each month; `twn-t2-chron.png`, `sau-t7-drawer.png` (`turn.ts:465`) | Neither the US nor Japan recognises Taiwan, and Beijing doesn't react. China, India and Mexico don't sign alliances. The 2025 Russia–Iran treaty has no defence clause. | P0 |
| Canada, Germany, Denmark and France sign mutual-defence treaties with Ukraine in month 1 (UK in month 2) | `ukr-t1-chron.png` | NATO states would be treaty-bound to fight Russia, yet nothing follows | P0 |
| "France: Emmanuel Macron re-elected" (2 of 3 runs) | `twn-t6-chron.png`, `sau-t7-drawer.png` (`government.ts:298`, no term limits) | Macron is constitutionally barred from a third term | P0 |
| Ukraine's scripted events ignore the Feb 2027 ceasefire: blackout strikes, "front cracks near Huliaipole", the Manpower Wall, a force "only after a ceasefire", "the guns may fall silent" | `ukr-t3-next.png`, `ukr-t6-next.png`, `ukr-t11-next.png` | Contradicts the game's own war state | P1 |
| Sudan coup in all 3 runs, with a revolution after it; generals invented ("Amna el-Nur", "Khalid Idris", "Yasir Elamin") | `sau-t9-chron.png`, `twn-t2-chron.png` | Implausible churn and name mash-ups (round 2 item 11 still open) | P1 |
| Revolutions: Houthis replaced by an "Ahmed al-Ahmar democratic republic"; Abbas toppled; Iran's new "Ebrahim/Hassan Moradi" | `ukr-t3-chron.png`, `sau-t7-drawer.png` | Fantasy outcomes in a realism mode | P1 |
| The Global Summit lifts the arms embargo on North Korea every summer (all runs); flags shown are 🇦🇫🇦🇪 | `twn-t8-chron.png` (`events.ts:350`) | Only the UN Security Council lifts that embargo, and China and Russia alone couldn't do it | P1 |
| Russia airstrikes "Turkey's nuclear facilities" | `sau-t11-chron.png` | A NATO member is attacked and Turkey has no weapons programme; Akkuyu is a Rosatom plant | P1 |
| The briefing calls MBS "King of Saudi Arabia"; headlines read "SALMAN'S answer" and "CHING-TE'S answer" | `sau-01-briefing.png`, `twn-t1-chron.png` | Salman is king, and Lai is the surname | P1 |
| The US dossier lists Israel as a treaty ally | `twn-t1-dossier-UnitedStates.png` | There is no US–Israel defence treaty | P1 |
| "Strong growth lifts the national mood" every month while Saudi GDP falls from $1.24T to $1.18T; Taiwan's GDP is flat with 8 days of LNG left | `sau-t2-chron.png`, `twn-t3-chron.png` | The causal text contradicts the data, and the blockade has no economic effect | P1 |
| US–Iran and Israel–Iran fronts: "smashes through defenses", ~6,000 casualties a month, "Iran makes sweeping gains" against Israel | Chronicle, all runs | Israel and Iran share no border; this is an air and missile war, not a ground war | P1 |
| Smaller items: Ukraine's election comes 1 month after the ceasefire, under martial law; Saudi intel rates Iran's nuclear status NONE; advisors suggest "Court North Korea" (Taiwan) and a Saudi–Lebanon pact; Taiwan's frigate is fired on while "escorting" after I chose to reflag | various | Text doesn't follow the facts or my choices | P2 |

## Clarity friction
- **Saudi verdict:** a D with ☆☆☆, while the card shows "✓ bonus ★" twice and an all-green strip. Nothing warned me the score was the binding constraint; the advisors just said "Court Lebanon" for "world standing".
- **Ceasefire confusion:** "Russia rejected the ceasefire proposal" and "Ceasefire between Russia and Ukraine" appear in the same month with no explanation (exhaustion).
- Advisors push Court Japan at 100/100 and National address until "the press mocks your spin"; 5 of 12 months were quiet in Quarantine and in Ukraine.
- **Dates disagree:** the Chronicle masthead and the Record sit a month apart (THIS MONTH · MAY vs "Apr 2027" for the same events).

## Bugs (repro)
1. **Intelligence estimate above 100%.** Quarantine/Taiwan → World → Japan shows "Stability 69%–125%"; Ukraine → Germany shows 66–112%.
2. **Wrong flags on global events.** Global Summit and "OIL SHOCK" stories are tagged 🇦🇫🇦🇪 whatever the content (`twn-t4-chron.png`).
3. **Typos.** "intelligence picture sharpened.."; "Saudi Arabia citizens"; "catastrophic floods strikes".

## Scores
| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 7 | 6 | 8 | 5 | 6 | 6 |

Realism held at 5: better leaders and writing, offset by treaty spam and Macron.

## Top 3 changes
1. **Gate AI defence pacts** (`turn.ts` ~465): require prior alignment and recognition, no pacts with states at war unless the partner joins, none for China, India or Mexico, about 2 per year worldwide; Ukraine's deals are "security assurances".
2. **Elections and regime change:** term limits (France 2027 picks a successor); throttle Sudan, Yemen and Iran coups; real figures or "an unnamed general"; no yearly embargo lift for North Korea.
3. **State-aware text:** flashpoint events check ceasefire, escort and reflag state; causal lines follow the data; fix "bin Salman", "Lai" and MBS's title.
