# Iteration 1 backlog (non-design items found during build)

| ID | Item | Source | Owner | Status |
|---|---|---|---|---|
| B-01 | Hormuz hook credits the "positive step" remark to Iran's foreign minister; one source credits Mohsen Rezaei (SNSC) and says Araghchi had no plans to meet US officials | Content consultant (WP4) | Content | Done |
| B-02 | Quarantine hook says Taiwan's defence budget was cut "roughly in half"; reports say about 38% (NT$780bn of NT$1.25tn) | Content consultant | Content | Done |
| B-03 | Bab al-Mandab hook/debrief describe a counteroffensive that "ground forward"; government forces withdrew from the strait area on 15 November | Content consultant | Content | Done |
| B-04 | Fire on the Nile hook describes El Obeid as besieged; the army reportedly broke the siege in November | Content consultant | Content | Done |
| B-05 | Glossary PENDING strings in Hud, CommandRail, budget.ts, Detail, Navigator, staff.ts, EndGameReport, map menu | WP3 | Owning UI packages | Open |
| B-06 | Assassination/coup against a protected target is now refused before it runs (was: aborted op that still cost capital); document in GAMEPLAY | WP1 | Docs | Done |
| B-07 | Hidden map keeps rendering behind the Desk (~33,800 draw calls/s); 97 infinite CSS animations at idle | QA repro #1 | FEEL-7 | In progress |
| B-08 | Capital toast never clears (gameStore.ts:1110, App.tsx:141) | QA repro #2 | Orders WP5 (toast) | Open |
| B-09 | Enter in All orders search queues the first hit ("Strike nuclear sites") with no confirmation (Detail.tsx:285) | QA repro #3 | Orders WP4/WP6 | Open |
| B-10 | Generated prose "Salman on After the..." and lede "On after the..." (reactions.ts:361, turn.ts:1634) | QA repro #8a | Month engine (WP-I) | Open |
| B-11 | Tension reads 74.2 (tile), 71.6 (card), 71 (paper) in the same month | QA repro #6 | Month WP-H (result card) | Open |
| B-12 | Title preselects the first flashpoint, not today's crisis (TitleScreen.tsx:107) | QA repro #8d | Month WP-G (onboarding) | Open |
| B-13 | Escape does not close the newspaper opened after the debrief | QA repro | Month WP-H | Open |
| B-14 | Reveal home-press quote says "Approval from 64%" while the approval series starts at 56 (Bab al-Mandab run) | Reveal UI agent | Engine (reveal-text.ts) | Open |
| B-15 | Engine still sends the series label "Leadership score" (UI relabels to "Score"); fixture perception.approval lacks elections | Reveal UI agent | Engine | Open |
| B-16 | Remaining "before the midterms" premises conflict with a late-November start: Ceasefire or Collapse USA briefing ("two days before the midterms") and crisis us_midterm_peace; Hormuz Convoy briefing and crisis us_midterm_clock ("Three days to the midterms") | Era content agent | Content | Open |
| B-17 | Nations that did not exist in an era (1960 UKR, BLR, SYR, ARE, PSX; 1990 UKR, BLR) are still playable with generated leaders; eraStatus now marks them; make them non-playable in newGame and the title UI | Era content agent, concept test (Marcus) | Worldmap W5 / engine | Open |
| B-18 | 1990 Soviet Union Term: smart play wins about 31% (band 65%+), pre-existing | Era content agent sim | Engine balance | Open |
