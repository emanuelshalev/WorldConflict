# Round 3 confirmation: Priya (IR grad student, 1440×900), 2.0.0-rc.1

Evidence: `/tmp/claude-0/confirm/priya/` (screenshots, `<seat>.log`, `legacy-*.log`).

## What I played
- **Bab al-Mandab, Saudi Arabia:** Muscat channel, ceasefire in month 2. **A ★★★, score 121** (it was a D).
- **Ceasefire or Collapse, Ukraine:** ceasefire in Jan 2027, coalition accepted. **A ★★★.**
- **Scarborough Line, Philippines:** arbitration, joint patrol. **A ★★★.**
- **API:** two Legacy runs (DEU and BRA) for elections; one Quarantine turn for the headline.
- **Pacts signed or offered per run:** 6, 6 and 4; Legacy 9 and 10. Round 3 had about 25.

## Previous items
| Item | Status | Evidence |
|---|---|---|
| Pact flood | PARTLY | Volume is fixed, but the partners aren't: China–Pakistan in 4 of 5 runs, China–Russia, Russia–Iran, and Japan signs 3 treaties every Legacy run |
| Ukraine month-1 pacts | PARTLY | Canada's pact offer comes in month 1 while Ukraine is at war; offers to the player skip the at-war check (`turn.ts` ~531) |
| Macron re-elected | FIXED | 5 of 5 runs: "Term-limited, Emmanuel Macron hands over", Apr–May 2027 |
| Ukraine scripts ignore the ceasefire | PARTLY | No Huliaipole or snap election, but the "Blackout winter" crisis arrives in Feb 2027, after the Jan ceasefire (`ukr-t4-desk.png`) |
| Sudan coup every run | PARTLY | Revolution in 3 of 5 games; "Fatima/Yasir Abdelrahman" are invented |
| North Korea embargo lifted at summits | FIXED | It doesn't happen any more (Iran: see below) |
| "King" MBS; SALMAN'S / CHING-TE'S | FIXED | "Crown Prince and Prime Minister"; "MOHAMMED BIN SALMAN'S"; "LAI CHING-TE'S" |
| US–Israel treaty | FIXED | Israel isn't in the US pact list |
| Growth text vs GDP | FIXED | Ukraine at −1.0% reads "shrinking economy". One slip: Saudi month 12 says "shrinking" while the HUD shows +1.2% |
| Israel–Iran ground wording | FIXED | "AIR CAMPAIGN SETTLES INTO GRIM ROUTINE" |
| Intel above 100% | FIXED | Capped, e.g. China "55%–100%" |

**7 FIXED, 4 PARTLY, 0 NOT FIXED.**

## New realism errors
| Item | Why it's wrong | Sev |
|---|---|---|
| Bab al-Mandab scripts after the Dec 2026 ceasefire: the "Ras Tanura" strike crisis (m7), "Storm Perim" (m9), and the Houthis offering "a ceasefire" (m11) | Same bug as Ukraine; no `requiresWar` on these scripts | P1 |
| Term limits cover only 6 countries. Re-elected anyway: Erdoğan 2028, Díaz-Canel 2028, Ramaphosa 2029, Sisi 2030, Lai 2032 | All five are constitutionally barred | P1 |
| China signs mutual-defence treaties (Pakistan, Russia); Japan signs 3; Russia–Iran; Nigeria–South Africa; Brazil–South Africa | Implausible partners: China's only ally is the DPRK, and Article 9 constrains Japan | P1 |
| Saudi "General strike: unions shut down ports" (twice) | Unions and strikes are banned in Saudi Arabia | P1 |
| "A devastating typhoon strikes Ukraine" | Typhoons don't reach Ukraine | P1 |
| Two Palestinian juntas in a row ("Gen. Mustafa Nusseibeh", then "Gen. Hanan Shtayyeh"); an Iranian junta under "Gen. Reza Hosseini" | Invented officers, fantasy outcomes | P1 |
| The Global Summit lifts Iran's arms embargo (2028, 2029); flags still 🇦🇫🇦🇪 | Only the UNSC can do that, and snapback came in 2025 | P2 |
| "Iran holds the initiative; pressure mounts on Israel to seek terms" | Inverts the real air balance | P2 |
| Russia strikes Turkey; NATO is silent. Lebanon offers Saudi Arabia a pact | Implausible | P2 |
| "Saudi Arabia citizens"; "ANSWER TO ANSWERING RIYADH AIRPORT"; the briefing repeats MBS's title; a "reassurance force after any ceasefire" while one holds; "caretaker" Netanyahu with elections in 2028/30 | Text sloppiness and contradictions | P2 |
| Unverified (after my cutoff): PM Andy Burnham (from Jul 2026), Lula's 2026 win, the US–Iran and Israel–Iran wars in Nov 2026, Iraqi PM Ali al-Zaidi, a Duterte verdict | — | — |

**Balance:** a naive policy (first option without "⚠ mission", plus the top two suggestions) got A ★★★ in all three seats, Brutal Ukraine included.

## Scores
| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 7 | 7 | 8 | 6 | 6 | 7 |

## Verdict
A real step up. Before calling it realistic, gate the Gulf and blackout scripts on the ceasefire, check for war before pact offers to the player, and extend term limits beyond 6 countries.
