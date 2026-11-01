# Player-Persona Panel: Round 2

*Branch `feat/engagement-overhaul`, build of 2026-11-01, Algorithmic AI only. 11 UI sessions were driven through Playwright (Maya on a 390×844 phone viewport, the others at 1440×900). Five long games were driven through the API (Turkey and Pakistan 48-month Terms, three Iran Terms). Crisis choices came from a per-persona policy over each card's arrows and text, plus scripted orders for Leo. Screenshots and logs are in `/tmp/claude-1000/-home-emanuel-git-WorldConflict/560a71e3-7113-4ffa-aea8-74191a508a8c/scratchpad/personas2/<run>/`.*

---

## 1. Maya: casual, phone (Daily Flashpoint + Quarantine)

**Played.**
- **Daily *Fire on the Nile*, Egypt.** 12 months to the end screen: **Mission complete, B, ★★☆**, score 114, approval 45%→79%. About 10 min (12 × ~50 s).
- ***Quarantine*, Taiwan (Brutal).** 12 months: **Mission failed, C, ☆☆☆**, US relations short of 56. About 10 min.

**Quotes.**
- "I bombed convoys and the newspaper's front page is literally about me. +7.4 approval. Love it."
- "Why do my advisors want me to court Ethiopia *every single month*? It went from −70 to −99 while I was courting them."
- "I failed Taiwan because the US didn't like me enough? Nobody told me to call Washington. The only suggestion was 'Court China'."

**Delight.** About 10 s from title to first decision; 12 different, specific crises in 12 months (*The empty canal* cites Ras El-Hekma and 1977); the Chronicle's "Your month in Egypt" box gives instant cause and effect; the phone layout is playable; the streak box and emoji strip land.

**Friction.**
- Advisors ignore the mission and repeat a useless "Court X" (§5 #1).
- On phone the chosen option scrolls out of view, Execute is below the fold, and the tip says "crisis on the left, orders on the right" (`maya-daily/03-t1-desk.png`). Six pips overflow the HUD ("SCOR", `maya-taiwan/10-t8-desk.png`).
- Egypt had 0 close calls and an all-green strip; the Taiwan fail came unannounced (the phone mission chip shows only "5 MO LEFT").

**Churn point.** None in session 1. After the Taiwan fail: "I did what they said and lost." She'd still come back for tomorrow's daily.

| | Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|---|
| R1 | 3 | 5 | 4 | 5 | 2 | 2 |
| **R2** | **7** | **6** | **7** | 6 | **8** | **7** |

---

## 2. Dan: grand-strategy veteran (One Term, Brutal/Tough, plus Legacy)

**Played.**
- **API, 48 months:** Pakistan (Brutal, Normal) and Turkey (Tough), both TERM_COMPLETED ★★☆ (Pakistan grade D, Turkey grade C).
- **API, Iran (Brutal):** three Terms, all lost: revolution at month 7 (Hard), country collapse at month 10, coup at month 10 or 29.
- **UI:** One Term Iran on Hard for 6 months (stability 48→0) and the Legacy start as Pakistan on Hard for 3 months.
- **Time:** about 2.5 h equivalent (≈170 turns × 60–90 s).

**Quotes.**
- "Order previews with success odds are excellent: 'Propose ceasefire 3%', 'Spy on Israel 79%'. That is the Twilight Struggle feeling."
- "Pakistan: 48 months of peace, GDP $396B → $342B, economic score 25 → 3, and nothing in the Chronicle tells me why. I 'won' ★★ with a D."
- "Turkey: stability 99, legitimacy 100, approval 84 by month 24. Saturation is back, just slower."
- "Iran is not Brutal, it's scripted death. Reform plus address every month: stability 0 by month 6 and **stuck at 0 for two years with legitimacy 86**, then a coup."
- "I joined Russia's war as North Korea and got 'NORTH KOREA VICTORIOUS' three times. My GDP went from $21B to $288B in three months on reparations."

**Delight.** Real crisis variety (22–23 per Term, 15–20 templates, escalating standoffs, delayed "fine print" follow-ups); coup plots telegraphed with stats; clear Mission and World drawers; random seeds per game.

**Friction.**
- Political capital sat at the 6-pip cap for 45 of 48 months, so it is not a constraint for a normal player.
- The score arc still runs backwards (Pakistan 97→78, Turkey peaks at 126 at month 24 then falls to 104).
- Orders that look affordable get rejected (§6 bug 3); `/turn` leaks every AI's rejected moves (§6 bug 7).

**Churn point.** Around month 25 of the Turkey Term: maxed stats, decaying economy, nothing to optimise. He'd return for Legacy only if economy and war resolution get fixed.

| | Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|---|
| R1 | 5 | 6 | 4 | 4 | 4 | 4 |
| **R2** | **6** | **7** | **7** | 4 | **5** | **5** |

---

## 3. Priya: IR student (Hormuz Convoy / Iran, Scarborough Line / Philippines)

**Played.**
- **Hormuz, Iran (Brutal):** 12 months, **Mission failed, D**, legitimacy 0% at the end. About 18 min (12 × 90 s, every card read).
- **Scarborough, Philippines (Tough):** 12 months, **Mission failed, C**, US relations below 78. About 18 min.
- **Debriefs:** read both on the end screen.

**Quotes.**
- "*This* is the scenario list I asked for: Hormuz, Taiwan quarantine, Caracas after Maduro, the Indus. The hooks cite real dates and sources."
- "The crisis writing is the best thing in the game: *Who rules in Tehran?* with the Assembly of Experts, and *The weapon in the tunnels* with the Isfahan stockpile."
- "Who am I? The briefing says the Assembly elevated *me*, the mission says I 'speak for a Supreme Leader few have seen', the debrief names Mojtaba, the HUD says 'Hassan Ahmadi'."
- "'A narrow electoral-college victory' in the Philippines? There is no electoral college."
- "'REVOLUTION TOPPLES UNITED STATES GOVERNMENT — Trump has fled; Sarah Mitchell proclaims a new government.' I'm out."

**Facts that felt off:**
- **The player is never the real leader** (Mohamed Hassan for Sisi, Manuel Reyes for Marcos), and the generic backstory contradicts the brief, while AI leaders are real (Modi, Trump, Abiy).
- **Iran–Saudi relations start at −70.** Riyadh and Tehran restored ties in 2023. Courting Saudi Arabia left them pinned at −99 all game.
- **"Ethiopia warship … in international waters"** in an incident with Egypt. Ethiopia is landlocked.
- **"Refugees from Iran pour toward Egypt"**, which shares no border with Iran.
- **Name mash-ups** ("Benazir Sharif"; "General Amna al-Burhan" deposes al-Burhan) and odd regime labels (Pakistan and Turkey are AUTOCRACY yet face voters; Legacy Pakistan's election is "in 12 mo", not 2029).

**Friction.**
- Both fails hinged on relation thresholds no advisor pointed to; advisors pushed "Court China" for 12 months (−65 → −61).
- Iran's legitimacy fell 20 points in one month with no explanation.

**Churn point.** The US-revolution headline in a "realistic" mode. She'd still finish the flashpoints for the debriefs.

| | Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|---|
| R1 | 5 | 5 | 5 | 3 | 5 | 5 |
| **R2** | **7** | **6** | **8** | **5** | **7** | **7** |

---

## 4. Leo: streamer, chaos (Ceasefire or Collapse / Russia, Water War / Pakistan, Legacy / North Korea)

**Played.**
- **Ceasefire or Collapse, Russia:** massed troops on Poland in month 1, declared war on it in month 2. **Game over at month 2: Mission failed, C.** About 2 min.
- **Water War, Pakistan:** months 1–6 he massed troops, tried to assassinate Modi, tried to back a coup in India ("India is too stable"), ran airstrikes and armed rebels, and attempted a nuke ("only authorized in wartime"). Declaring war in month 7 brought instant Mission failed, C. About 8 min.
- **Legacy, North Korea:** war on South Korea rejected for capital after Execute; joined Russia's war via a crisis card; nukes on Korea, Japan and the USA refused ("only in wartime"). About 8 min.

**Quotes.**
- "I declare war on NATO and the game says I'm a… **Cautious Caretaker**? With every box ✗, including 'Stay in power' (I *was* in power)."
- "Two months, card done. That's not a clip, that's a disconnect."
- "Assassinate Modi: '✓ Carried out.' Modi is fine. Did I miss? Did anyone notice?"
- "NORTH KOREA VICTORIOUS. NORTH KOREA VICTORIOUS. GDP up 1,300%. Best accidental clip of the day."

**Delight.** The Chronicle's tabloid look and NEW ALLIANCE stamp stream well; the coup-plot card at 6% stability is suspenseful; "Blame Canada" is a real option; the 1200×630 share card renders cleanly and Save card / Copy text work (`leo-russia/card-world-conflict-rus.png`).

**Friction.**
- Every flashpoint objective bans war, so chaos ends the run on the spot. The war preview never says "this fails your mission".
- Nukes need an existing war, so a chaos player can't escalate step by step.
- The share card and text carry no score, no headline, no month or seed, and no link to the game. The copy text is four lines.

**Churn point.** The first instant fail. He'd move to Legacy for chaos and skip Flashpoints.

| | Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|---|
| R1 | 6 | 5 | 3 | 2 | 4 | 4 |
| **R2** | 6 | **6** | **8** | **4** | **5** | **5** |

---

## 5. Cross-persona synthesis

### What improved most

1. **Session shape:** 10-minute Flashpoints with a verdict, a one-tap daily, a Term that ends at the ballot box (round-1 issues #3 and #7 solved).
2. **Crisis variety:** from 3 identical cards in 45 turns to about 1 per month and 15–20 templates per Term, with real-world specificity.
3. **Feedback:** the Chronicle leads with *your* decision, deltas and causes; previews show odds.
4. **Current content:** Ukraine, Iran, Taiwan, Venezuela, Sudan; real AI leaders (Merz, Carney, Takaichi); debriefs.
5. **Look and phone:** polished title, desk, Chronicle and end screen; a playable phone layout; no watermarks.

### Top 10 remaining issues (impact × personas)

| # | Issue | Personas | Where seen |
|---|---|---|---|
| 1 | **Advisors ignore the mission; "Court X" doesn't work.** Same Court suggestion monthly while relations fall; missions fail on thresholds nobody suggested. | M, P, D | `Desk.tsx` `useSuggestions()`; `maya-taiwan/10-t8-desk.png` |
| 2 | **Incoherent verdict.** "Cautious Caretaker" in 9/9 runs (even a war on NATO); "✗ Stay in power" while in office; C for a month-2 fail, D for a ★★ Term win. | all 4 | `scoring.ts` `classifyLeadership`; `EndScreen.tsx`; `leo-russia/10-end.png` |
| 3 | **Fictional player leader with a backstory that contradicts the brief.** | P, D, L | `data-loader.ts:436`, `generatePlayerBackstory`; `priya-hormuz/03-briefing.png` |
| 4 | **Chaos ends Flashpoints instantly and silently.** Declaring war fails the mission with no preview warning, and nukes need an existing war. | L | `src/core/objectives.ts` `earlyFailure`; `preview.ts` |
| 5 | **Long-game economy and score.** Peacetime GDP −10–14%, economic score 25→3, backwards score arc, Turkey saturates at 99/100, Iran stability pinned at 0. | D | `dan-pak.txt`, `dan-tur.txt`, `irn3.mjs` |
| 6 | **Absurd events:** US revolution, North Korean reparations windfall, Ethiopian warship, Iran→Egypt refugees, name mash-ups. | P, D (L enjoys) | `military.ts:217`, `government.ts`, `events.ts` |
| 7 | **Hidden political-capital accounting.** The desk doesn't subtract crisis-option costs, so orders fail after Execute. | L, D | `Desk.tsx` `pcLeft`; `leo-nk/06-t1-chronicle.png` |
| 8 | **Covert outcomes are misreported.** A failed assassination shows "✓ Carried out"; a success gets only a minor "Assassination in India". | L, P | `src/core/turn.ts` turnReport orders |
| 9 | **Phone/HUD polish:** pip overflow, wrong tip, hidden chosen option, layer bar over labels, invisible tension bar, chip over zoom. | M, D | `Hud.tsx`, `wc.css:555-568` |
| 10 | **Generic share card, little drama:** no score, headline, date or link; Maya's win had 0 close calls, all green. | L, M | `EndScreen.tsx`; `maya-daily/card-world-conflict-egy.png` |

### Prioritised fix list

**P0**
1. Make suggestions mission-aware: rank by unmet `objectiveStatus` conditions ("Court United States: mission needs 56+, now 41"). Stop suggesting Court when the last 2 attempts didn't raise relations, and show the Court delta in the Chronicle. (`Desk.tsx`, plus relation drift in the engine.)
2. Fix the end-screen verdict:
   - "Stay in power" is ✓ unless the player was deposed.
   - Add archetypes such as "Warmonger" and "Gambler" from the actual actions.
   - Cap the grade at D/F on a mission fail.
   - Show "month 12/12", not "13/12". (`scoring.ts`, `EndScreen.tsx`, `Hud.tsx`.)
3. Flashpoints: play as the real leader by default ("Mojtaba Khamenei", "Ferdinand Marcos Jr."), and use the flashpoint's role and briefing as the backstory. The leader field becomes an optional override. (`data-loader.ts:436`.)
4. Warn before a mission-ending order: the preview shows a red "This ends your mission" banner, and a confirm step goes on the war and nuke buttons. (`preview.ts`, `Desk.tsx`.)
5. Count crisis-option capital costs in the desk's "capital left". (`Desk.tsx`.)

**P1**
6. Cap reparations relative to the winner's GDP; block revolutions in consolidated democracies unless stability stays under 10 for months (`military.ts:217`, `government.ts`).
7. Economy: explain score and GDP change ("Embargo −0.8%/mo"); fix peacetime decline, stat saturation and Iran's stability pinned at 0.
8. Honest covert results ("✗ Assassination failed — Modi survived; India suspects you"); a successful one becomes a front-page Moment (`turn.ts`).
9. Phone: condense pips, layout-aware tip, sticky chosen option and Execute; give the tension bar a width (`wc.css` `.stat`, `.tension`).
10. Share card and text: score, key headline, date or daily number, URL; colour the strip by objective progress.
11. Data checks: no naval incidents for landlocked states, refugees only from neighbours, Iran–Saudi around 0, no name mash-ups, fix "A Ethiopia" and "United States's".
12. Server: drop non-player `rejectedActions` from `/turn`; de-duplicate same-template crises within a month.

---

## 6. Bugs (with repro)

Paths are relative to the personas2 scratchpad directory.

1. **"✗ Stay in power" on every non-deposed loss.** Play *Quarantine* as Taiwan for 12 months without courting the USA (`maya-taiwan/14-end.png`, `priya-scarb/14-end.png`).
2. **Archetype always "Cautious Caretaker".** *Ceasefire or Collapse* as Russia, declare war on Poland in month 2: Cautious Caretaker, grade C (`leo-russia/10-end.png`).
3. **Desk-accepted orders rejected for capital.** Legacy North Korea: pick "Launch an independent commission" (Pol. capital ▼▼), then Declare war. The Chronicle says "✗ Not enough political capital (1 left, needs 2)" (`leo-nk/06-t1-chronicle.png`).
4. **Failed assassination shows "✓ Carried out".** `/new-game {PAK, FLASHPOINT, water-war}` then `/turn` with `INTEL_ASSASSINATE IND`: Modi survives in 3 of 4 runs, ledger says "Carried out" (`assas.mjs`, `leo-waterwar/09-t2-chronicle.png`).
5. **Reparations GDP explosion.** Legacy North Korea, "Join the war" on *Russia asks for help*: GDP $21B → $288B in months 6–9 (`military.ts:217`).
6. **Revolution topples the US government** (Daily *Fire on the Nile*, month 12; `maya-daily/log.txt` line 1285).
7. **Fog leak.** The `/turn` response `rejectedActions` holds every AI's failed proposals with unrounded relation values ("currently -95.29423094019332"). (`dan-pak.txt`)
8. **The same crisis twice in one month.** "The streets are boiling" appeared twice in month 5 of the Iran One Term on Hard (`dan-term-ui/log.txt`).
9. **"Court X" never improves relations** (Egypt→Ethiopia −70 → −99 while courting monthly; `maya-daily` log).
10. **HUD "month 13/12"** behind the end screen (`maya-daily/15-end.png`).
11. **World-tension bar invisible on desktop** (`dan-legacy/06-t2-desk.png`); **phone HUD overflow** with 6 pips (`maya-taiwan/10-t8-desk.png`).
12. **Minor:** the mission chip covers the zoom "+" (`priya-hormuz/10-t8-desk.png`); the dossier shows "in power since turn 0" (`dan-term-ui/09-map-click-dossier.png`); Escape doesn't close Settings; a React duplicate-key warning in the ticker (`leo-waterwar` console); a map glyph 404 for the emoji range; the scripted "North Korea fires missiles" event fires when the player is North Korea (`leo-nk/06-t1-chronicle.png`).
