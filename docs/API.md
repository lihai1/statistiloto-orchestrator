# Statistiloto-New — API Reference

All UI-facing endpoints are exposed by the Java BFF at `/api/*` through
Traefik. The UI never calls the Go service directly.

## Authentication

| Endpoint             | Method | Auth | Description                                                           |
|----------------------|--------|------|-----------------------------------------------------------------------|
| `/api/auth/verify`   | GET    | No   | Traefik ForwardAuth target. Returns 200 if the Bearer token is valid. |
| `/api/me`            | GET    | Yes  | Returns the authenticated user's profile (incl. persisted archive window). |
| `/api/me/archive`    | PUT    | Yes  | Update the user's preferred archive date range (persisted across sessions). |

### GET /api/me

Returns the authenticated user's profile. Auto-creates a `user_profile` row on
first login. The `archiveFrom`/`archiveTo` fields are the user's preferred
archive date range (persisted in `app.user_profile`); `null` means "use the
defaults" (2004-02-12 / today).

Response:

```json
{
  "sub": "f:google-1234:abc",
  "email": "user@statistiloto.local",
  "displayName": "User Name",
  "roles": ["USER"],
  "archiveFrom": "2024-01-01",
  "archiveTo": "2024-12-31"
}
```

### PUT /api/me/archive

Update the authenticated user's preferred archive date range. Persisted so the
same window is restored across sessions and devices. Either field may be `null`
or blank to clear it (fall back to defaults).

```json
{
  "from": "2024-01-01",
  "to": "2024-12-31"
}
```

| Field   | Type   | Required | Notes                                                          |
|---------|--------|----------|----------------------------------------------------------------|
| `from`  | string | no       | `YYYY-MM-DD` (validated). `null`/blank = clear (use defaults). |
| `to`    | string | no       | `YYYY-MM-DD` (validated). `null`/blank = clear (use defaults). |

Response: identical to [`GET /api/me`](#get-apime) with the updated window.

## Lottery Computation (proxied to Go via gRPC)

| Endpoint                    | Method | Auth | Description                                    |
|-----------------------------|--------|------|------------------------------------------------|
| `/api/generate/form`        | POST   | Yes  | Generate lottery number combinations.          |
| `/api/generate/statistics`  | POST   | Yes  | Calculate frequent pairs/groups.               |
| `/api/generate/analyze`     | POST   | Yes  | Analyze user-selected numbers.                 |
| `/api/generate/simulate`    | POST   | Yes  | Backtest a ticket against historical draws.    |

### POST /api/generate/form

```json
{
  "howMany": 6,
  "formType": 1,
  "willBe": [1, 2, 3],
  "from": "2024-01-01",
  "to": "2024-12-31",
  "strength": "strong"
}
```

Response:

```json
{
  "forms": [[1, 5, 12, 23, 34, 41]]
}
```

### POST /api/generate/statistics

```json
{
  "howMany": 10,
  "formType": 2,
  "strength": "strong"
}
```

Response:

```json
{
  "pairs": [
    { "numbers": [3, 17], "count": 42 }
  ]
}
```

### POST /api/generate/analyze

```json
{
  "form": [1, 2, 3, 4, 5, 6],
  "from": "2024-01-01",
  "to": "2024-12-31"
}
```

Response:

```json
{
  "frequency": { "1": 15, "2": 8 },
  "matches": [
    { "drawId": "1234", "drawDate": "2024-03-15", "matchedNumbers": [1, 2, 3], "matchCount": 3 }
  ]
}
```

### POST /api/generate/simulate

Backtest a user's ticket against every historical draw in the archive window.
Supports systematic forms (6, 8, 10, or 12 numbers) — for N > 6, all C(N,6)
combinations are played per draw.

```json
{
  "form": [1, 8, 11, 21, 25, 26],
  "strong": 3,
  "from": "2024-01-01",
  "to": "2024-12-31",
  "ticketCost": 3.0,
  "prizeAmounts": []
}
```

| Field           | Type             | Required | Notes                                                                |
|-----------------|------------------|----------|----------------------------------------------------------------------|
| `form`          | `number[]`       | yes      | 6, 8, 10, or 12 numbers (systematic forms).                          |
| `strong`        | `number`         | no       | Strong number 1–7. `0`/omitted = no strong number.                   |
| `from`/`to`     | `date` (ISO)     | no       | Historical window. Omit = full archive.                              |
| `ticketCost`    | `number`         | no       | Ticket cost per combination (ILS). Default 3.0.                      |
| `prizeAmounts`  | `number[]`       | no       | Len 0/8. Per-tier ILS overrides. 0=tier 1 (6+strong) … 7=tier 8 (3). |

Response:

```json
{
  "draws": [
    {
      "drawNumber": 1234,
      "drawDate": "2024-03-15",
      "winningNumbers": [3, 11, 21, 29, 34, 37],
      "winningStrong": 5,
      "tierHits": [
        { "tier": 4, "hits": 1, "amountPerHit": 50.0, "total": 50.0 }
      ],
      "prizeWon": 50.0,
      "ticketCost": 3.0,
      "usedRealPrizes": true
    }
  ],
  "summary": {
    "totalDraws": 312,
    "totalCombinations": 312,
    "totalSpent": 936.0,
    "totalWon": 142.0,
    "net": -794.0,
    "tierSummaries": [
      { "tier": 1, "label": "6+strong", "totalHits": 0, "totalAmount": 0.0 }
    ],
    "drawsWithRealPrizes": 280
  }
}
```

> `usedRealPrizes` / `drawsWithRealPrizes` reflect whether the prize amounts came
> from the scraped per-draw data (`lottery_results.prize_amounts`, populated by the
> prize scraper) rather than service defaults or user-supplied overrides.

## Saved Numbers (owned by Java BFF)

| Endpoint                    | Method | Auth | Description                          |
|-----------------------------|--------|------|--------------------------------------|
| `/api/user/numbers`         | GET    | Yes  | List the user's saved number sets.   |
| `/api/user/numbers`         | POST   | Yes  | Save a new set of numbers.           |
| `/api/user/numbers/{id}`    | DELETE | Yes  | Delete a saved set.                  |

### POST /api/user/numbers

```json
{
  "category": "lucky",
  "numbers": [1, 5, 12, 23, 34, 41],
  "willBe": [7],
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```

## AI Agent (proxied to Python via HTTP)

All agent endpoints live under `/api/agent/*` on the Java BFF, which forwards
them (with the user's JWT) to the Python LangGraph service on the internal
network. The UI never calls the Python service directly. Chat/approve return
the agent's JSON; admin endpoints are gated by the `ADMIN` role
(`@PreAuthorize("hasRole('ADMIN')")`).

| Endpoint                              | Method | Auth   | Description                                      |
|---------------------------------------|--------|--------|--------------------------------------------------|
| `/api/agent/chat`                     | POST   | Yes    | Send a message to the agent (may pause for HITL).|
| `/api/agent/chat/stream`              | POST   | Yes    | SSE streaming variant of `/chat` (text/event-stream). |
| `/api/agent/approve`                  | POST   | Yes    | Approve/reject a paused write-tool action.       |
| `/api/agent/health`                   | GET    | No     | Proxied agent liveness (`/healthz` on agent).    |
| `/api/agent/sessions`                 | GET    | Yes    | List the caller's agent sessions.                |
| `/api/agent/sessions/{sessionId}`     | GET    | Yes    | Get one session's history.                       |
| `/api/agent/sessions/{sessionId}`     | DELETE | Yes    | Delete one session.                              |
| `/api/agent/sessions`                 | DELETE | Yes    | Delete all of the caller's sessions.             |

### POST /api/agent/chat

```json
{
  "session_id": "abc-123",
  "message": "Generate a strong form for the last 6 months",
  "intent": "generate",
  "context": { "formType": 1 },
  "config_id": 2,
  "lang": "he"
}
```

| Field        | Type     | Notes                                                                      |
|--------------|----------|----------------------------------------------------------------------------|
| `session_id` | string   | Required. LangGraph thread id; reused across chat + approve.              |
| `message`    | string   | Required. User utterance.                                                  |
| `intent`     | string   | Optional hint for the supervisor router.                                   |
| `context`    | object   | Optional structured UI context (page, selected numbers, groupSize).       |
| `config_id`  | integer  | Optional. Override the active LLM with a stored config for this request only. |
| `lang`       | string   | Optional. Language hint (`he` / `en`) forwarded to workers.                |

Response (normal completion):

```json
{
  "response": "Here are 3 forms ...",
  "thread_id": "abc-123",
  "paused": false
}
```

Response (agent paused for human approval of a write tool):

```json
{
  "response": "I want to save these numbers. Approve?",
  "thread_id": "abc-123",
  "paused": true
}
```

### POST /api/agent/chat/stream

SSE streaming variant of `/api/agent/chat`. Same request body, but the response
is `text/event-stream` — the Java BFF opens a no-read-timeout `HttpClient`
connection to the agent's `/chat/stream` and relays SSE events as they arrive.
The emitter does not time out (LLM token streams can be long-running on small
local models).

Request body: identical to [`POST /api/agent/chat`](#post-apiagentchat).

SSE event types (relayed from the agent):

| Event `type` | Description                                                  |
|--------------|--------------------------------------------------------------|
| `token`      | LLM output token (partial response text).                    |
| `tool`       | Tool call started / completed (name + args + result).        |
| `hitl`       | Agent paused for human approval (`{ tool, args }`).          |
| `done`       | Stream complete (`{ thread_id, paused }`).                   |
| `error`      | Error during generation (`{ message }`).                     |

> When a `hitl` event arrives, the UI calls `POST /api/agent/approve` with the
> same `session_id`; the agent resumes and may open a new stream or return the
> final result synchronously.

### POST /api/agent/approve

```json
{
  "session_id": "abc-123",
  "approved": true,
  "edited": null
}
```

`approved: false` rejects the action; `edited` (optional) carries an edited
tool argument when the user modifies the proposed action before approving.

## Admin (LLM config, telemetry, scraper, RAG)

All endpoints below require the `ADMIN` role.

| Endpoint                                  | Method | Description                                              |
|-------------------------------------------|--------|----------------------------------------------------------|
| `/api/agent/llm-config`                   | GET    | Current active LLM provider/model/settings.             |
| `/api/agent/llm-config`                   | PUT    | Update the active LLM configuration.                    |
| `/api/agent/llm-configs`                  | GET    | List all stored LLM configurations.                     |
| `/api/agent/llm-configs`                  | POST   | Create a new stored LLM configuration.                  |
| `/api/agent/llm-configs/{configId}`       | PUT    | Update a stored configuration (name, provider, model, base_url, api_key, timeout). |
| `/api/agent/llm-configs/{configId}/activate` | PUT | Activate a stored configuration by id.                  |
| `/api/agent/llm-configs/{configId}/test`  | POST   | Smoke-test a stored configuration.                      |
| `/api/agent/llm-configs/{configId}`       | DELETE | Delete a stored configuration.                          |
| `/api/agent/llm-models?provider=ollama&base_url=...` | GET | List models available from a provider (optional `base_url` to query a non-default endpoint). |
| `/api/agent/free-llm`                     | GET    | Read the free-tier LLM toggle (whether free users get LLM or a canned response). |
| `/api/agent/free-llm`                     | PUT    | Set the free-tier LLM toggle (`{ "enabled": true }`).   |
| `/api/agent/token-usage`                  | GET    | Per-user token consumption (from `agent.token_usage`).  |
| `/api/agent/audit-log?limit=50`           | GET    | Agent action history (from `agent.audit_log`).          |
| `/api/agent/reindex`                      | POST   | Rebuild the pgvector RAG embeddings.                    |

### PUT /api/agent/llm-config

```json
{
  "provider": "ollama",
  "model": "qwen2.5:0.5b",
  "base_url": "http://ollama:11434",
  "api_key": null,
  "request_timeout_seconds": 300
}
```

Response:

```json
{
  "provider": "ollama",
  "model": "qwen2.5:0.5b",
  "base_url": "http://ollama:11434",
  "api_key": null,
  "request_timeout_seconds": 300,
  "status": "active",
  "note": null
}
```

> The scraper control surface lives in the UI admin section, which triggers
> the Go scraper through the agent's `trigger_scraper` write tool (HITL-gated)
> rather than a dedicated BFF REST endpoint.

## Health & Observability

| Endpoint                | Service | Description            |
|-------------------------|---------|------------------------|
| `/actuator/health`      | Java    | Liveness/readiness     |
| `/api/agent/health`     | Java    | Proxied agent liveness |
| `/health`               | Go      | Liveness               |
| `/healthz`              | Agent   | Liveness (internal)    |
| `/realms/statistiloto`  | Keycloak| OIDC issuer            |
