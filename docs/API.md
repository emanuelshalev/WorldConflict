# ⚡ API Reference

Base URL: `http://localhost:8080`. All bodies are JSON. Every response has `success: boolean`; errors add `error: string`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/api/llm/status` | Which server-side LLM keys are configured |
| GET | `/api/scenarios` | Scenarios, flashpoints and today's daily challenge |
| GET | `/api/scenarios/:id/map` | The era map for the title globe |
| GET | `/api/countries` | Playable nations with difficulty tags |
| GET | `/api/codex?scenario=&flashpoint=` | Real-world explanations (codex entries, situation briefings) for one game |
| POST | `/api/new-game` | Start a session |
| POST | `/api/turn` | Resolve one month |
| POST | `/api/preview-action` | Predict an order's effects (no state change) |
| POST | `/api/orders/menu` | Every order for one target, with cost, chance and availability |
| GET | `/api/report/:saveId` | End-of-session report |
| GET | `/api/reveal/:saveId` | The end-of-session reveal (after the game) |
| POST | `/api/runs` | Record a finished run |
| GET | `/api/runs?seat=` | Run history for a seat |
| GET | `/api/load/:saveId` | Load a save |
| GET | `/api/saves?playerId=` | List saves for an account or guest id |
| DELETE | `/api/save/:saveId` | Delete a save |
| POST | `/api/chat/advisor` | Ask a cabinet minister (LLM or built-in) |
| POST | `/api/chat/test` | Test an LLM configuration |
| GET | `/api/chat/advisor/roles` | Advisor roles |
| POST | `/api/chat/advisor/clear` | Clear advisor conversations for a save |
| DELETE | `/api/chat/advisor/:saveId` | Drop advisor sessions for a save |
| POST | `/api/auth/register` · `/api/auth/login` | Optional accounts (`{ name, password }`) |

---

## Game payload

`/new-game`, `/turn` and `/load` return the same core payload:

```jsonc
{
  "success": true,
  "saveId": "…",
  "worldState": { /* fog-filtered: foreign countries carry estimates, not ground truth */ },
  "playerView": [ /* per country: public facts + uncertain ranges {estimate, low, high, confidence} */ ],
  "pendingDecisions": [ /* crisis cards: title, situation, options[{id,label,description,effects,tensionDelta,backedBy,followUp}] */ ],
  "objectiveStatus": [ { "label": "…", "met": true, "failed": false, "bonus": false } ],
  "score": { "economic": 25, "security": 25, "approval": 25, "prestige": 25, "total": 100 },
  "gameOver": null,
  "playerBackstory": "…",
  "pcIncome": 3,   // political capital refill next month (2, 3 in a Flashpoint, +1 on Analyst)
  "pcCap": 6,      // the most political capital the bank can hold
  "advice": { "suggestions": [], "cabinetPicks": {}, "missionPicks": {}, "meetingPicks": {}, "deputies": [], "staffOrders": [], "missionNotes": {} },
  "missionImpact": { /* per crisis or meeting option: helps / hurts / breaks objectives */ },
  "orderImpact": { /* the same for each suggested order */ }
}
```

`advice`, `missionImpact`, `orderImpact` and `objectiveStatus` come from `monthAdvice()` (`src/core/advisors.ts`, `missionImpact.ts`) and are computed from the player's beliefs, never ground truth. The desk, the map strip and the harness `staff` policy all read the same advice.

Notable `worldState` fields: `mode` (`FLASHPOINT|TERM|LEGACY`), `maxTurns`, `difficulty`, `objective`, `politicalCapital`, `turnReport` (orders, decisions, deltas, causes, moments), `outcome` (`victory`, `stars`, `conditions`), `director` (`closeCalls`, `rallies`).

---

## POST `/api/new-game`

```json
{
  "playerCountryId": "UKR",
  "mode": "FLASHPOINT",
  "flashpointId": "ceasefire-or-collapse",
  "scenarioId": "2026",
  "difficulty": "STATESMAN",
  "leaderName": "Olena Kovalenko",
  "playerId": "guest-…",
  "daily": false,
  "seed": 12345
}
```

Only `playerCountryId` is required. A country that is not a sovereign state in the chosen scenario (its `eraStatus`, for example Ukraine in 1990) is refused with a 400 unless the body has `"whatIf": true` (alternate history: the seat is led as a state, the save name ends in "(what if)" and `worldState.origin.whatIf` is set; the flag changes nothing for a seat that is a state). `opening` (Term/Legacy only) names an active situation of the scenario (`/scenarios/:id/map` `situations` with phase `ACTIVE`, e.g. `"ukraine"`): the opening crisis is about it (`templateId` `opening_war|sea|regime|nuclear|truce`); an unknown or inactive id is a 400. Every new world carries `origin` (scenario, seat, seed, mode, difficulty, flashpoint, leaderName, whatIf, opening) and `inputs` (the player's actions and decisions per resolved month), which replay and branch use. Without `flashpointId`, `mode` + `scenarioId` start a Term/Legacy (or generic 12-month) game. `daily: true` seeds the world from today's date. Omit `seed` for a fresh world each time. The same `seed` on the same seat gives the same starting world and opening crisis ("Replay same opening").

`seedCode` ("Play this seed") replaces `playerCountryId` + `seed` + seat: `HC-USA-3AF` is flashpoint seat (two-letter flashpoint prefix: initials of its id, e.g. `hormuz-convoy` = HC), country and base-36 seed; `T2026-USA-3AF` / `L2026-…` are Term / Legacy on a scenario. An unknown code is a 400.

## POST `/api/turn`

```json
{
  "saveId": "…",
  "playerActions": [
    { "type": "DIPLOMACY_IMPROVE_RELATIONS", "targetCountryId": "TUR" },
    { "type": "MILITARY_AIRSTRIKE", "targetCountryId": "IRN", "params": { "targetType": "NUCLEAR" } }
  ],
  "decisions": [{ "decisionId": "dec_rival_ultimatum_3_0", "optionId": "negotiate" }],
  "ai": {
    "tier": "KEY_DECISIONS",
    "provider": "anthropic",
    "apiKey": "sk-ant-…",
    "model": "claude-haiku-5-5",
    "budgetUsd": 1
  }
}
```

`ai` is optional (omitted = algorithmic). Response adds `events`, `newspaper`, `governmentChanges`, `resolvedActions`, `rejectedActions` and:

```jsonc
"ai": {
  "tier": "KEY_DECISIONS",
  "turnUsage":  { "calls": 1, "promptTokens": 1640, "completionTokens": 210, "costUsd": 0.00027, "fallbacks": 0 },
  "totalUsage": { /* cumulative for this save */ },
  "statements": [{ "countryId": "RUS", "leader": "President Vladimir Putin", "text": "…" }],
  "llmCountries": ["RUS"],
  "notice": null            // e.g. "LLM budget cap ($1.00) reached, algorithmic AI this turn"
}
```

### Action types

| Category | Types |
|---|---|
| Diplomacy | `DIPLOMACY_IMPROVE_RELATIONS`, `DIPLOMACY_DENOUNCE`, `DIPLOMACY_PROPOSE_ALLIANCE`, `DIPLOMACY_BREAK_ALLIANCE`, `DIPLOMACY_DECLARE_WAR`, `DIPLOMACY_PROPOSE_CEASEFIRE`, `DIPLOMACY_MEDIATE` (target = one side of a war you are not in) |
| Military | `MILITARY_MOBILIZE`, `MILITARY_DEMOBILIZE`, `MILITARY_PROCURE` (`value` = $M), `MILITARY_AIRSTRIKE` (`params.targetType`: `MILITARY\|INDUSTRIAL\|NUCLEAR`), `MILITARY_DEPLOY_BORDER`, `MILITARY_WITHDRAW_BORDER` |
| Nuclear | `NUCLEAR_FUND_PROGRAM`, `NUCLEAR_STRIKE` (wartime only) |
| Intelligence | `INTEL_GATHER`, `INTEL_COUNTER_INTEL`, `INTEL_SABOTAGE`, `INTEL_DESTABILIZE`, `INTEL_SUPPORT_REBELS`, `INTEL_MISINFORMATION`, `INTEL_PROPAGANDA`, `INTEL_ASSASSINATE`, `INTEL_COUP` |
| Domestic | `DOMESTIC_PROPAGANDA`, `DOMESTIC_REFORM`, `DOMESTIC_POLICING` (`params.tactic`: `SOFT\|HARD`), `ECONOMY_ADJUST_MILITARY_BUDGET` (`value` = % of GDP) |

Orders the player can't afford (political capital or defense budget) come back in `rejectedActions` with a reason. `resolvedActions` / `rejectedActions` contain **only the player's own entry** (keyed by the player's country id): AI plans are never sent to the client.

`leaderName` is optional: omit it to govern as the scenario's real leader (e.g. Volodymyr Zelensky); flashpoints then use the objective briefing as `playerBackstory`.

`turnReport.orders[].ok` is the order's real outcome: covert operations that were carried out but failed report `ok: false` with `detail` starting `Failed:`; Court orders report the relation change (`Relations -41 → -34`).

## GET `/api/reveal/:saveId`

The end-of-session reveal (`src/core/reveal.ts`, `RevealPayload`). 409 while the game is running, 404 for an unknown save. Optional `?playerId=` or `?guestId=` fills `ranking.personalBest` from earlier runs on the seat. Main blocks: `seat`, `verdict` (same stars/grade as `outcome`), `presidency` (0-1000: `parts` mission/timing/leadership/finish, `modifier`, `career`), `achievements` (`earned`, two `locked` hints, rarity tier and measured rate), `moments` (best, worst, turning point, went well / badly, timing callouts), `perception` (approval series, elections, relations, press, judgement), `numbers` (five series and counts), `declassified` (the only foreign ground truth the client ever receives, post-game), `truth` (flashpoint reality rows with BETTER/SAME/WORSE/CONTEXT verdicts, fear, sources, debrief), `replay` (seed, `seedCode`, `deterministic`), `ranking` (benchmark ticks and percentile from `data/benchmarks/`), `beatNext`, `run` (the run record).

While a game runs, `worldState.chronicle` is sent without its ground-truth parts (`start`, `plots`).

## POST `/api/runs`

`{ "saveId": "…", "guestId": "guest-…" }` records a finished run, derived server-side from the save (409 while running). One result per save; posting again replaces it. Returns `run` and `rank: { position, of }` among the owner's runs on that seat.

## GET `/api/runs?seat=<seatKey>&playerId=|guestId=&limit=50`

`runs`: the owner's runs (newest first; `parts`, `achievements`, `detail` with `seedCode`, `series`, `choices`, `aiTier`). `top`: the seat's top 20 among signed-in players. Seat keys are `flashpointId:COUNTRY` or `scenario:MODE:COUNTRY`.

## GET `/api/scenarios/:id/map`

The era map for the title globe (`buildEraMap` in `src/core/era-map.ts`), display data built from the scenario file and the country profiles; the engine never reads it. 404 for an unknown scenario, `Cache-Control: public, max-age=3600`.

```jsonc
{
  "success": true,
  "map": {
    "scenarioId": "1990", "year": 1990, "month": 1, "name": "…", "tension": 40,
    "focus": [20, 30],                 // where the globe turns for this era
    "countries": [{ "id": "UKR", "name": "…", "leader": { "name": "…", "title": "…", "sinceDate": "…" },
                    "stability": 60, "bloc": "WARSAW", "status": "PART_OF", "partOf": "RUS",
                    "label": "Ukrainian SSR", "note": "…", "nuclear": "NONE" }],
    "blocs": [{ "id": "…", "name": "…", "side": "EAST", "members": [] }],
    "situations": [ /* heaviest first: kind, phase, at, weight, blurb, flashpointId?, codexId? */ ],
    "wars": [{ "a": "…", "b": "…" }],
    "rivals": [{ "a": "…", "b": "…", "relation": -70 }],   // top 8 at -60 or worse, not at war
    "merged": [{ "id": "…", "partOf": "RUS" }],            // borders painted as their parent
    "hotspots": [], "labels": [], "labelAllow": []
  }
}
```

`status` is `STATE`, `PART_OF` or `NOT_INDEPENDENT`; a country without `leader` has a leader invented for the era.

## GET `/api/codex?scenario=<id>&flashpoint=<id>`

The codex for one game (design-learn.md §7): real-world explanations of the people, places, groups, terms and events that crisis and briefing text names, plus the situation briefings. Static content from `data/codex/` (schemas in `src/core/codex.ts`), not part of `WorldState`: fetched once at new game or load and kept by the client. Both parameters are optional: `flashpoint` alone implies its scenario and start date, no parameters means scenario `2026`. 404 for an unknown scenario or flashpoint, 400 for a malformed id.

```json
{
  "success": true,
  "version": "3f2a9c0d1e4b5a67",
  "scenarioId": "2026",
  "flashpointId": "ceasefire-or-collapse",
  "date": "2026-11",
  "entries": [
    {
      "id": "fortress-belt", "kind": "place", "name": "The fortress belt",
      "aliases": ["fortress belt"], "avoid": [], "countryId": "UKR", "obscurity": 3,
      "short": "Four fortified cities in Ukrainian-held Donetsk ...", "long": "...",
      "related": ["kramatorsk", "sloviansk"], "map": { "countries": ["UKR"], "points": [] },
      "valid": { "from": "2022-09" }, "sources": ["https://..."], "asOf": "2026-11-22"
    }
  ],
  "situations": [
    {
      "id": "ceasefire-or-collapse", "title": "...", "oneLine": "...",
      "whoIsWho": [{ "entryId": "volodymyr-zelensky", "stance": "..." }],
      "whyItMatters": "...", "timeline": [{ "date": "2022-02-24", "text": "...", "source": "https://..." }],
      "gameStarts": "2026-11", "map": { "countries": ["UKR", "RUS"], "points": [] },
      "onThisCard": [], "sources": ["https://..."], "asOf": "2026-11-22"
    }
  ]
}
```

- `entries`: only those valid at `date` (`valid.from <= date <= valid.to`), with the scenario's `eras[scenarioId]` override applied (`name`, extra `aliases`, `short`, `long`, `obscurity`); `eras` and `reviewedBy` are not sent. Aliases are strings (case-insensitive, whole word) or `{ text, caseSensitive, wholeWord }`.
- `situations`: the flashpoint's briefing (id = flashpoint id) and the scenario's (`scenario-<scenarioId>`), whichever exist, flashpoint first.
- `version` is a content hash and also the `ETag`; `If-None-Match` with it answers 304. `Cache-Control: public, max-age=86400` in production. Outside production (`NODE_ENV !== "production"`) the route checks a stamp of `data/codex`, `data/codex/situations`, `data/scenarios` and `data/flashpoints` on every request, drops its caches when a file changed, and sends `no-cache`, so a running dev server never serves stale codex content.

## POST `/api/preview-action`

`{ "saveId": "…", "action": { … } }` → `preview: { summary, costM, budgetM, costPC, pcAvailable, affordable, successChance (0–100 or null), effects[], risks[], blocked, block, irreversible, missionWarning }`. `block` is the rule-layer reason as `{ code, reason, fix, points, alt? }` (`src/core/availability.ts`) and `blocked === block?.reason`. `missionWarning` is non-null when the order would fail ("This ends your mission: …"), endanger ("Mission at risk: …") or cost a bonus star of the session objective; the order card asks for confirmation on its confirm face before queuing it.

## POST `/api/orders/menu`

`{ "saveId": "…", "targetCountryId": "IRN" | null }` → `{ turn, targetCountryId, pcIncome, pcCap, orders[] }`. One entry per engine order (`src/core/orders.ts`) that acts on that country, or every order that acts at home when `targetCountryId` is null: `{ id, type, params, label, targeted, costPC, costM, budgetM, defenseShare, chance, block, irreversible, missionWarning, summary, effects[], risks[] }`. `block` is the rule layer only (wars, pacts, warheads, stability). The client adds the month layer (capital left, orders this month, defense budget left, duplicates) from the unsent month, with the same copy as `monthBlock()`. One request per menu or catalog open, cached per `turn:target`; 400 on an unknown country, 404 on an unknown save.

## POST `/api/chat/advisor`

```json
{ "saveId": "…", "role": "INTELLIGENCE_CHIEF", "message": "How close is Iran to a bomb?",
  "llm": { "provider": "anthropic", "apiKey": "…", "model": "claude-haiku-5-5" } }
```

Roles: `FOREIGN_MINISTER`, `DEFENSE_MINISTER`, `FINANCE_MINISTER`, `INTELLIGENCE_CHIEF`, `DOMESTIC_ADVISOR`, `CHIEF_OF_STAFF`. With an LLM, the response includes `usage` (turn + cumulative). The client falls back to its built-in advisor brain if this fails.

---

## Rate limits

Turn: 1 req/s · chat: 5 req/s · default: 10 req/s per IP (`src/api/middleware/rateLimit.ts`).

### `POST /api/branch`

```json
{ "saveId": "uuid", "month": 4, "playerId": "guest-..." }
```

Branch from this month: rebuilds the save's world at the start of `month` (0 = the opening desk) from `worldState.origin` and the first `month` entries of `worldState.inputs`, with the rivals' intents from the save's turn log (exact even when LLMs drove them) or PersonalityAI, and stores it as a new save named "<name> (branch from month N)". Returns the same payload as `/load` plus `branchedFrom`. 400 for a month outside 0..turn (0..turn-1 for a finished game) or a save made before the replay record existed; 404 for an unknown save.

### `GET /api/saves?playerId=&guestId=`

Saved games of the account and/or the guest id together, newest first (all saves without either). Each row: `id`, `name`, `turn`, `playerCountry`, `leaderName`, `seed`, `createdAt`, `updatedAt`, `mode`, `scenarioId`, `flashpointId`, `difficulty`, `maxTurns`, `gameOver`, `branchable`, `whatIf`, `opening`.
