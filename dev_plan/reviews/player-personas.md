# Player-Persona Playtest Panel: World Conflict

*Branch `feat/engagement-overhaul`, Nov 2026. Six games were played through the API: Maya/USA 25 turns, Dan/India 45, Priya/Israel 40, Leo/Russia, Mexico and North Korea 5–6 turns each, all on the 2025 scenario. Every turn's newspaper and crisis text was read. UI was reviewed from the desktop baseline screenshots plus a new 390×844 phone tour. Drivers and logs are in `scratchpad/personas/`.*

---

## 1. Maya: casual, 10–15 min sessions (played USA)

**Session.** Maya picked the top-left flag (USA) and did the "nice" things: improve relations with China, Mexico, Canada and Russia, plus domestic reform. When a crisis came up she took the first option.
- Turn 1 news: *"Israel launches airstrikes on Iran"*, *"Mexico and United States sign military pact"*, *"North Korea covert operation EXPOSED in United States, Our agents penetrated United States's institutions…"*
- Turn 2 brought her first crisis, *"Border clash with Russia, Your border units exchanged fire with Russia forces."* It came back word for word on turns 4 and 10. These were the only three decisions she got in 25 turns.
- From turn 10 her stability sat at 100. Approval rose steadily to 100 and the score crept from 102 to 148. No war, nothing at stake, and the end of the game is 120 turns away.

**Think-aloud.**
- "Wait, *we* share a border with Russia?"
- "Okay I de-escalated… and it happened again. And again."
- "My approval is 100% and I literally did nothing. Am I winning? What's the goal?"

**Delight.** The crisis card format is Reigns-like and readable, with three clear choices. The morning briefing is short.

**Confusion / boredom.** She has no goal and no session end. Her own actions never show up in the news, so nothing confirms they did anything. The headlines are mostly other countries' spy stories. On phone the map is not visible at all and the header text wraps into a stack ("01 | Turn 0", "Minister tester1838"). In the automated phone tour the game state was lost after confirming the turn (needs manual verification).

**Churn point.** Turn 4, when the identical Russia clash came back. "I've seen everything this game has." In a real session she leaves by about the 10-minute mark.

| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 3 | 5 | 4 | 5 | 2 | 2 |

**Top 5 wishes**
1. A short mode: a 12–24 turn mini-campaign with a clear objective ("Keep approval >60 and avoid war until the election").
2. A playable phone layout with the map visible.
3. My action shown as the first headline each turn ("Your outreach to Beijing thaws relations +5").
4. A shareable end-of-session card.
5. More crisis variety: never the same card twice in a row.

---

## 2. Dan: grand-strategy veteran (played India, 45 turns)

**Session.** Dan probed the systems on purpose: intel on Pakistan, `/preview-action` before every move, military budget to 4%, alliance attempts, border deployment, a pre-war airstrike, then war.
- **The preview is genuinely good.** Before the US alliance it said *"would refuse outright, relations are 55, must be 60+"*. Before war it said *"Pakistan has defense pacts with China, Saudi Arabia, Turkey, expect them to join the war"* and *"☢ ATTACK MEANS DISASTER"*, with a force ratio of 3.73:1. Intel confidence on Pakistan rose from 50% to 89% after repeated INTEL_GATHER.
- Turn 11 news: *"WAR: India attacks Pakistan, Prime Minister You ordered the invasion… China, Saudi Arabia, Turkey declared war on India."* India then posted *"INDIA ADVANCES ON ALL FRONTS"* against Saudi Arabia and Turkey, countries it does not border.
- Pakistan went through two coups in two months (*"General Benazir Khan now leads a junta"*). Then came *"Ceasefire between Pakistan and India, Following Pakistan's initiative"*, with India holding the frontline at 73. There was no victory, no peace terms, and nothing was gained.
- Approval hit 100 during a four-front war, and the news said *"India: You re-elected, Prime Minister You secured another term."*
- Turns 19–45 were peace. The only input was the same *"Border clash with Pakistan"* crisis (three in the whole game, all identical). Over those turns India's economic score fell from 40 to 24 while GDP was flat. He could not tell why.

**Think-aloud.**
- "The preview panel is the best thing here. It told me the truth about the pacts."
- "Saudi Arabia and I are trading trenches? Where is this front?"
- "I won the war on the map and got… a ceasefire Pakistan offered. What did I get?"
- "Approval 100 for 30 turns means the domestic layer is a decoration."

**Delight.** Belief ranges and intel confidence are real Twilight-Struggle-ish fog. The alliance cascade warning is honest.

**Confusion / fake depth.**
- One abstract frontline per country pair, with no geography and no supply.
- Wars end only by ceasefire or a capitulation that changes nothing visible.
- The score drifts without explanation.
- With 25 countries and no Ukraine, Taiwan, Syria or Venezuela, there are no proxy theatres.
- The seed is derived from scenario, country and leader name, so replaying the same setup gives an identical history.

**Churn point.** About turn 25: peace, a maxed-out domestic layer, and nothing to optimise. "I'd uninstall, then check the changelog in six months."

| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 5 | 6 | 4 | 4 | 4 | 4 |

**Top 5 wishes**
1. War outcomes with teeth: peace treaties with terms (reparations, buffer zones, regime change), war goals, and spheres that persist.
2. A domestic layer that pushes back: approval decay, war weariness, factions, budget trade-offs that bind.
3. A score and economy breakdown ("why did my economic score fall?") plus a ledger of relation changes.
4. Random seed per campaign, an ironman mode, and multi-day saves with a 120-turn arc that has mid-game goals.
5. Fewer automatic pact triggers. Allies should weigh whether to honour a pact, the way a real alliance would.

---

## 3. Priya: IR student, current events (played Israel, 40 turns)

**Session.** Priya picked Israel to play out the Iran file: intel on Iran, two nuclear-site airstrikes, sabotage, an assassination, Saudi normalisation attempts, and soft policing.
- First reaction: "Where's Ukraine? Gaza? Hezbollah? Taiwan? Venezuela?" None of them exist. The 2025 scenario has `startingWars: []` and starts in January 2025 with Scholz as Chancellor. Later, *"Germany: Olaf Scholz re-elected"* ran even though Merz won in February 2025. Netanyahu is replaced by "You".
- Her strike *"Israel launches airstrikes on Iran, struck Iran's nuclear facilities"* worked; the second was repelled. After her assassination: *"LEADER OF IRAN ASSASSINATED, Supreme Leader Ali Khamenei… Reza Moradi assumes power"* and *"No one has claimed responsibility, yet."* That was a good moment.
- Then the Iran carousel: six regime changes in 36 turns (coup → coup → coup → revolution "new democratic republic" → revolution → revolution). Each one was printed twice (*"COUP D'ÉTAT IN IRAN"* plus *"Military coup in IRN"*).
- Crises: *"Border clash with Egypt"* (twice, despite a 46-year peace treaty), *"Border clash with Iran"* (no shared border), and one corruption scandal.
- Saudi relations went 33 → 48 over 30 turns. Every pact proposal was rebuffed and there was no Abraham-Accords path.

**Think-aloud.**
- "The country dossiers are actually great. The Turkey blurb about drones and the Kurdish question is spot-on."
- "Egypt and Israel border clashes? That's… not how 2025 works."
- "Iran has had six governments. Is anyone in Tehran OK?"
- "Why can't I be Netanyahu? I want to see what *he* would do."

**Delight.** The historical profiles, red lines and national character text are strong. The belief ranges teach the uncertainty of intelligence work.

**Confusion.** Nothing explains why events happened (no causal tooltip). Scenario data is stale. "Border clash" fires between non-neighbours. Generated names look odd ("Benazir Khan", leaders who all share the surname Hosseini).

**Churn point.** In the first 5 minutes, on finding no Ukraine, Gaza or Taiwan. She'd stay for a single "what-if" (assassinate Khamenei) and leave after about 15 turns of repetitive Iran coups.

| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 5 | 5 | 5 | 3 | 5 | 5 |

**Top 5 wishes**
1. Current-events scenarios: Ukraine war 2026, Gaza/Hezbollah/Iran, Taiwan Strait, Venezuela. Include non-state actors and the missing countries (UKR, TWN, VEN, SYR).
2. Play as the real leader (Netanyahu, Zelensky, Xi) with a "historical advisor" note on what they actually did.
3. A causal "Why did this happen?" link on every headline, plus an end-of-game explainer tying events to IR concepts (deterrence, alliance entrapment).
4. Geography-aware events: no border clashes between non-neighbours; naval and missile strikes for distant enemies.
5. Up-to-date data for Nov 2026, with a "data as of" date.

---

## 4. Leo: streamer, chaos and clips (played Russia, Mexico, North Korea)

**Russia.**
- Turn 1: mobilise, denounce the US, and try to assassinate Poland's leader: *"Poland's security cordon is impenetrable; the assassination plan was aborted."*
- Turn 2, declare war on Poland: *"WAR: Russia attacks Poland, President You ordered the invasion… United States, United Kingdom, Canada, France, Germany, Turkey declared war on Russia."* Leo loved this. "SEVEN WARS. CHAT."
- Russia *"SMASHES THROUGH DEFENSES"* against Canada. GDP crashed from 2.24T to 0.72T and stability to 2.
- Turn 5, a nuke on Poland: *"☢ GLOBAL NUCLEAR HOLOCAUST… Mushroom clouds rise over both nations"*, then immediate game over: *"Civilization as the twentieth century knew it has ended"* (in 2025).

**Mexico.** War on the USA brought eight countries into the war against Mexico. *"MEXICO MAKES SWEEPING GAINS"* against Australia and Israel. Turn 6: *"COUP D'ÉTAT IN MEXICO, Tanks surrounded the palace at dawn. The military has removed you from power."* Best clip of the session, but approval was 85% at the moment of the coup.

**North Korea.**
- The scripted event fires with the player as the subject: *"Supreme Leader You warns enemies of 'merciless consequences.'"* Chat laughed.
- The nuke on South Korea brought an embargo and nothing else. One more nuke on the USA meant holocaust and game over on turn 3.

**Think-aloud.**
- "Mexico is winning a land war against AUSTRALIA. I'm crying."
- "'Supreme Leader You' is the best typo in gaming."
- "One nuke and the game just… ends? Where's my end screen, my stats, my 'you killed X million' card?"

**Delight.** Pact cascades, coups, and the absurd headline generator. "RUSSIA VICTORIOUS, Russia has defeated United Kingdom" is screenshot-worthy.

**Boredom / problems.** Each run lasts 3–6 turns, then ends abruptly with a plain text reason. AI leaders have no voice: no threats, no ultimatums, no reactions to Leo personally. Every game opens identically, so viewers can't watch "a different world" twice.

**Churn point.** The first game-over screen. "No end card, no replay, no share. I can't make content from this."

| Fun | Clarity | Visual | Realism | Replay | Recommend |
|---|---|---|---|---|---|
| 6 | 5 | 3 | 2 | 4 | 4 |

**Top 5 wishes**
1. A cinematic, shareable end screen: headline collage, body count, "your legacy" newspaper front page, seed code.
2. Escalation that builds before it ends: DEFCON ladder, ultimatums, a red phone, second-strike drama over 2–3 turns.
3. AI leaders with personality lines (taunts, offers, betrayals) aimed at the player.
4. Seeds or daily challenges so viewers can replay "Leo's world".
5. Intentional satire: tongue-in-cheek headline variants, absurd-outcome achievements.

---

## 5. Cross-persona synthesis

### Top 10 issues (personas affected × severity 1–3)

| # | Issue | Personas | Sev | Score |
|---|---|---|---|---|
| 1 | **Crisis variety is too low.** Only 2 templates exist (border clash, corruption): 3–4 decisions in 25–45 turns, often identical, and none for warmongers. | all 4 | 3 | 12 |
| 2 | **Player's actions are invisible in the news.** No cause → effect explanation, and score/economy drift is unexplained. | all 4 | 3 | 12 |
| 3 | **No session goals or arc.** Approval and stability saturate at 100, and peace is a dead zone from about turn 15 to turn 120. | M, D, P | 3 | 9 |
| 4 | **Every new game is identical** for the same scenario, country and name; Israel strikes Iran on turn 0 in every game. | D, P, L | 3 | 9 |
| 5 | **Wars lack geography and resolution.** Any country "advances on all fronts" against distant countries, and wars end only by ceasefire, with no terms. | D, P, L | 3 | 9 |
| 6 | **Pact cascades are automatic.** Every war becomes 4–9 belligerents, which looks the same each time. | D, P, L | 2 | 6 |
| 7 | **The game ends abruptly with no end screen or shareable summary.** Nuke = instant game over. | M, L | 3 | 6 |
| 8 | **Stale or missing current-events content.** Ukraine, Taiwan, Venezuela and Gaza are absent, Scholz is still Chancellor, and the player can't be the real leader. | P, D | 3 | 6 |
| 9 | **Mobile layout is broken.** The map is hidden and the header wraps. | M, L | 3 | 6 |
| 10 | **Text and presentation bugs.** "You" as a name, "Our agents" in third-party news, duplicate coup headlines, ISO codes in headlines, "API KEY REQUIRED" basemap watermark. | all 4 | 1–2 | 6 |

### Session-mode needs

| Persona | Time | Goals | Saves |
|---|---|---|---|
| Maya | 10–15 min, 8–12 turns | One clear objective per session (survive election, avoid war) and a stamped result | Auto-resume on phone, one slot |
| Dan | 1–3 h sittings over days, 120 turns | Long-term national goals, win conditions beyond score, ironman | Multiple named slots, random seed, export |
| Priya | 30–60 min per scenario | "What-if" scenarios from the news with a debrief | Scenario bookmarks, a replay-from-turn-N branch |
| Leo | 20–40 min stream segments | Escalation arc built to peak, absurd achievements | Shareable seed, end-card image, daily challenge |

### What brings each back tomorrow

- **Maya:** a daily 10-turn "crisis of the day" with a streak and an end card.
- **Dan:** a patch that makes peace treaties, war weariness and approval decay matter, plus random seeds.
- **Priya:** a new current-events scenario dropping, e.g. "Taiwan Strait 2027" or "Ukraine ceasefire talks".
- **Leo:** something new to clip: a fresh seed, escalation drama, an end screen worth posting.

---

## 6. Bugs and oddities (with repro)

1. **The player's leader name is "You".** Repro: `POST /api/new-game {"scenarioId":"2025","playerCountryId":"PRK"}` without `leaderName`, then `POST /api/turn`. News reads *"Supreme Leader You warns enemies…"*, *"President You ordered the invasion"*, *"India: You re-elected"*. Source: `data-loader.ts:146`. The scripted NK missile event also fires even when the player is NK.
2. **Every game with the same setup is identical.** Repro: create two ISR/2025 games; both have seed `60399414`, the same backstory and the same events. Source: `game.ts:68-71` derives the seed from scenario, country and leader name.
3. **Covert-op headlines read wrong.** Every AI covert op is headlined "EXPOSED", including successful ones, and the body is the perpetrator's internal report. Example: *"Australia covert operation EXPOSED in China, Our agents penetrated China's institutions…"* Seen on turn 0 of any 2025 game.
4. **Duplicate government headlines** using ISO codes: *"COUP D'ÉTAT IN IRAN"* plus *"Military coup in IRN"*; *"Power changes hands in GBR"*. Any game, about turn 9 or later.
5. **"Border clash" between non-neighbours:** USA–Russia, Israel–Iran, Israel–Egypt, France–Russia. Source: `events.ts:73-83`.
6. **Distant land fronts with "sweeping gains".** Repro: as MEX, declare war on USA on turn 1. Turn 2 shows *"MEXICO MAKES SWEEPING GAINS, Fighting between Australia and Mexico"*.
7. **Airstrikes on non-existent programmes.** *"Russia CRIPPLES Turkey's NUCLEAR PROGRAM"* fires although Turkey's nuclear status is NONE (Dan's game, turns 13 and 36).
8. **Global tension pinned at 88–92 with zero wars** for 30+ turns (Maya turns 9–25, Priya turns 9–40). The +8/turn rise cap and 12% decay settle near 92, so tension stops carrying information.
9. **Approval runs to 100 regardless of conduct**, including during a four-front war (India) and a collapsing state (Mexico: 85% approval, stability 4.6, then a coup).
10. **Economic score falls while GDP holds or grows.** Israel: GDP 520→552B while the economic score went 29→20.
11. **Nuclear game-over text says "twentieth century"** in 2025 (`turn.ts:578`). The `gameOver.turn` value is one less than the turn shown in the world state.
12. **Belief range exceeds 100%.** `nuclearProgress` for Pakistan reads `high: 124.75`.
13. **Ground truth leaks to the client.** `POST /api/turn` returns the full `worldState` (all countries' true stats) alongside the belief-filtered `playerView`, so the fog is defeatable in devtools.
14. **Scenario data is stale.** 2025 has DEU Scholz (later *"Olaf Scholz re-elected"*), CAN Trudeau, no Ukraine or Taiwan, and `startingWars: []`.
15. **UI:**
    - The basemap shows "API KEY REQUIRED" watermarks.
    - The scenario label is doubled: "Modern Era (2025) (2025)".
    - The dossier shows "Relations: SATISFACTORY (-20)".
    - A white tooltip box overlaps the dossier (baseline `10-after-turn.png`).
    - On a 390px viewport the map is hidden, the header wraps, and the briefing showed "Next election in 25 months" against 9 months on desktop for the same country.
    - In the phone tour, state was lost after turn confirm (black "Click anywhere to skip" screen, then "Start a new game"). Needs manual verification.
16. **Pact oddities.** Turn 0 *"Mexico and United States sign military pact"* fires the same turn the US gets "Already allied" with Mexico. *"Russia and China sign military pact"* fires the same turn China's proposal to Russia is rejected.
