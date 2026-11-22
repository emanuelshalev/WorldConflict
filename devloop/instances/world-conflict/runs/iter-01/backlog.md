# Iteration 1 backlog (non-design items found during build)

| ID | Item | Source | Owner | Status |
|---|---|---|---|---|
| B-01 | Hormuz hook credits the "positive step" remark to Iran's foreign minister; one source credits Mohsen Rezaei (SNSC) and says Araghchi had no plans to meet US officials | Content consultant (WP4) | Content | Done |
| B-02 | Quarantine hook says Taiwan's defence budget was cut "roughly in half"; reports say about 38% (NT$780bn of NT$1.25tn) | Content consultant | Content | Done |
| B-03 | Bab al-Mandab hook/debrief describe a counteroffensive that "ground forward"; government forces withdrew from the strait area on 15 November | Content consultant | Content | Done |
| B-04 | Fire on the Nile hook describes El Obeid as besieged; the army reportedly broke the siege in November | Content consultant | Content | Done |
| B-05 | Glossary PENDING strings in Hud, CommandRail, budget.ts, Detail, Navigator, staff.ts, EndGameReport, map menu | WP3 | Owning UI packages | Done (QA verified) |
| B-06 | Assassination/coup against a protected target is now refused before it runs (was: aborted op that still cost capital); document in GAMEPLAY | WP1 | Docs | Done |
| B-07 | Hidden map keeps rendering behind the Desk (~33,800 draw calls/s); 97 infinite CSS animations at idle | QA repro #1 | FEEL-7 | Mostly done (desk stills after 15-20 s) |
| B-08 | Capital toast never clears (gameStore.ts:1110, App.tsx:141) | QA repro #2 | Orders WP5 (toast) | Done (QA verified) |
| B-09 | Enter in All orders search queues the first hit ("Strike nuclear sites") with no confirmation (Detail.tsx:285) | QA repro #3 | Orders WP4/WP6 | Done (QA verified) |
| B-10 | Generated prose "Salman on After the..." and lede "On after the..." (reactions.ts:361, turn.ts:1634) | QA repro #8a | Month engine (WP-I) | Done (QA verified) |
| B-11 | Tension reads 74.2 (tile), 71.6 (card), 71 (paper) in the same month | QA repro #6 | Month WP-H (result card) | Done (QA verified) |
| B-12 | Title preselects the first flashpoint, not today's crisis (TitleScreen.tsx:107) | QA repro #8d | Month WP-G (onboarding) | Done (QA verified) |
| B-13 | Escape does not close the newspaper opened after the debrief | QA repro | Month WP-H | Done (QA verified) |
| B-14 | Reveal home-press quote says "Approval from 64%" while the approval series starts at 56 (Bab al-Mandab run) | Reveal UI agent | Engine (reveal-text.ts) | Open |
| B-15 | Engine still sends the series label "Leadership score" (UI relabels to "Score"); fixture perception.approval lacks elections | Reveal UI agent | Engine | Open |
| B-16 | Remaining "before the midterms" premises conflict with a late-November start: Ceasefire or Collapse USA briefing ("two days before the midterms") and crisis us_midterm_peace; Hormuz Convoy briefing and crisis us_midterm_clock ("Three days to the midterms") | Era content agent | Content | Done (codex merge) |
| B-17 | Nations that did not exist in an era (1960 UKR, BLR, SYR, ARE, PSX; 1990 UKR, BLR) are still playable with generated leaders; eraStatus now marks them; make them non-playable in newGame and the title UI | Era content agent, concept test (Marcus) | Worldmap W5 / engine | Open |
| B-18 | 1990 Soviet Union Term: smart play wins about 31% (band 65%+), pre-existing | Era content agent sim | Engine balance | Open |
| B-19 | data/scenarios/2026.json briefing and description still say "This week: US midterms (3 Nov)" while the game opens later in November | Codex 2026 agent | Content | Open |
| B-20 | Hormuz Convoy USA objective label still "Approval of 56%+ after the midterms" (shown on option tags and the goal line) | Group Manager review | Content | Open |
| B-21 | Codex API caches per process: a running server serves stale codex after data merges (hid the briefings in review); invalidate on file change in dev or restart servers after data merges | Group Manager review | Engine / process | Open |
| B-22 | Main UI bundle above the 1,100 kB warning after iteration 2 merges; lazy-load heavy surfaces (reveal, codex drawer, galleries, maplibre) | Build warning | Frontend | Open |
| B-23 | GBR 1960 Term below the 65% seat floor (about 49% smart) | fix-history harness | Engine balance | Open |
| B-24 | ui/public/era/shapes.geojson missing: East Germany paints as West Germany, South Yemen not drawn | worldmap-eras | Content (W4 shapes) | Open |
| B-25 | 1960 data lists Algeria in labelAllow and also a "French Algeria" era label (code lets the era label win) | worldmap-eras | Content | Open |
| B-26 | Era situation cards have no codexId, so no "What is going on here?" link from the title globe | worldmap-eras | Content + UI | Open |
