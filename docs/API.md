# ⚡ API Reference

Base URL: `http://localhost:8080`. All bodies are JSON. Every response has `success: boolean`; errors add `error: string`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/api/llm/status` | Which server-side LLM keys are configured |
| GET | `/api/scenarios` | Scenarios, flashpoints and today's daily challenge |
| GET | `/api/countries` | Playable nations with difficulty tags |
| POST | `/api/new-game` | Start a session |
| POST | `/api/turn` | Resolve one month |
| POST | `/api/preview-action` | Predict an order's effects (no state change) |
| GET | `/api/report/:saveId` | End-of-session report |
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
  "playerBackstory": "…"
}
```

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

Only `playerCountryId` is required. Without `flashpointId`, `mode` + `scenarioId` start a Term/Legacy (or generic 12-month) game. `daily: true` seeds the world from today's date. Omit `seed` for a fresh world each time. The same `seed` on the same seat gives the same starting world and opening crisis ("Replay same opening").

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

## POST `/api/preview-action`

`{ "saveId": "…", "action": { … } }` → `preview: { summary, costM, budgetM, costPC, pcAvailable, affordable, successChance (0–100 or null), effects[], risks[], blocked, missionWarning }`. `missionWarning` is non-null when the order would fail ("This ends your mission: …"), endanger ("Mission at risk: …") or cost a bonus star of the session objective; the desk asks for confirmation before queuing it.

## POST `/api/chat/advisor`

```json
{ "saveId": "…", "role": "INTELLIGENCE_CHIEF", "message": "How close is Iran to a bomb?",
  "llm": { "provider": "anthropic", "apiKey": "…", "model": "claude-haiku-5-5" } }
```

Roles: `FOREIGN_MINISTER`, `DEFENSE_MINISTER`, `FINANCE_MINISTER`, `INTELLIGENCE_CHIEF`, `DOMESTIC_ADVISOR`, `CHIEF_OF_STAFF`. With an LLM, the response includes `usage` (turn + cumulative). The client falls back to its built-in advisor brain if this fails.

---

## Rate limits

Turn: 1 req/s · chat: 5 req/s · default: 10 req/s per IP (`src/api/middleware/rateLimit.ts`).
