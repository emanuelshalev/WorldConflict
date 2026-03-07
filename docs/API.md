# World Conflicts API Documentation

Base URL: `http://localhost:8080`

## Health Check

### GET /health
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Game API

### POST /api/new-game
Create a new game.

**Request Body:**
```json
{
  "scenarioId": "2025",
  "playerCountryId": "USA",
  "seed": 12345,
  "saveName": "My Game"
}
```

**Response:**
```json
{
  "success": true,
  "saveId": "uuid",
  "worldState": { ... }
}
```

### POST /api/turn
Execute a turn with player actions.

**Request Body:**
```json
{
  "saveId": "uuid",
  "playerActions": [
    { "type": "DIPLOMACY_IMPROVE_RELATIONS", "targetCountryId": "GBR" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "worldState": { ... },
  "events": [ ... ],
  "newspaper": [ ... ]
}
```

### GET /api/state
Get current active game state.

**Response:**
```json
{
  "success": true,
  "worldState": { ... },
  "saveId": "uuid"
}
```

### GET /api/state/:saveId
Get state for a specific save.

### POST /api/save
Save current game state.

**Request Body:**
```json
{
  "saveId": "uuid",
  "name": "Save Name",
  "worldState": { ... }
}
```

### GET /api/saves
List all saved games.

**Response:**
```json
{
  "success": true,
  "saves": [
    {
      "id": "uuid",
      "name": "Save Name",
      "playerCountry": "USA",
      "turn": 5,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/load/:saveId
Load a saved game.

### DELETE /api/game/:saveId
Delete a saved game.

---

## Chat API

### POST /api/chat/advisor
Chat with an advisor.

**Request Body:**
```json
{
  "saveId": "uuid",
  "role": "FOREIGN_MINISTER",
  "message": "What should we do about China?"
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "role": "FOREIGN_MINISTER",
    "analysis": "...",
    "recommendations": [
      {
        "action": { "type": "DIPLOMACY_IMPROVE_RELATIONS", "targetCountryId": "CHN" },
        "rationale": "...",
        "riskLevel": "MEDIUM",
        "expectedOutcome": "..."
      }
    ],
    "warnings": ["..."],
    "opportunities": ["..."]
  }
}
```

### GET /api/chat/advisor/roles
Get available advisor roles.

**Response:**
```json
{
  "success": true,
  "roles": [
    { "id": "FOREIGN_MINISTER", "name": "Foreign Minister" },
    { "id": "DEFENSE_MINISTER", "name": "Defense Minister" },
    { "id": "FINANCE_MINISTER", "name": "Finance Minister" },
    { "id": "INTELLIGENCE_CHIEF", "name": "Intelligence Chief" },
    { "id": "DOMESTIC_ADVISOR", "name": "Domestic Advisor" },
    { "id": "CHIEF_OF_STAFF", "name": "Chief Of Staff" }
  ]
}
```

### POST /api/chat/advisor/clear
Clear advisor session history.

**Request Body:**
```json
{
  "saveId": "uuid",
  "role": "FOREIGN_MINISTER"
}
```

### DELETE /api/chat/advisor/:saveId
Delete all advisor sessions for a save.

---

## Action Types

| Action Type | Description | Target Required |
|-------------|-------------|-----------------|
| `DIPLOMACY_IMPROVE_RELATIONS` | Improve relations with a country | Yes |
| `DIPLOMACY_DENOUNCE` | Publicly denounce a country | Yes |
| `DIPLOMACY_PROPOSE_ALLIANCE` | Propose alliance | Yes |
| `DIPLOMACY_BREAK_ALLIANCE` | Break existing alliance | Yes |
| `DIPLOMACY_DECLARE_WAR` | Declare war | Yes |
| `DIPLOMACY_PROPOSE_CEASEFIRE` | Propose ceasefire | Yes |
| `MILITARY_MOBILIZE` | Increase mobilization | No |
| `MILITARY_DEMOBILIZE` | Decrease mobilization | No |
| `ECONOMY_ADJUST_MILITARY_BUDGET` | Change military budget % | No (value field) |
| `DOMESTIC_PROPAGANDA` | Boost legitimacy | No |
| `DOMESTIC_REFORM` | Improve stability | No |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/turn` | 1 request/second |
| `/api/chat/advisor` | 5 requests/second |
| Default | 10 requests/second |

---

## Error Responses

All errors return:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
