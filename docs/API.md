# Statistiloto-New — API Reference

All UI-facing endpoints are exposed by the Java BFF at `/api/*` through
Traefik. The UI never calls the Go service directly.

## Authentication

| Endpoint             | Method | Auth | Description                          |
|----------------------|--------|------|--------------------------------------|
| `/api/auth/verify`   | GET    | No   | Traefik ForwardAuth target. Returns 200 if the Bearer token is valid. |
| `/api/me`            | GET    | Yes  | Returns the authenticated user's profile. |

## Lottery Computation (proxied to Go via gRPC)

| Endpoint                    | Method | Auth | Description                          |
|-----------------------------|--------|------|--------------------------------------|
| `/api/generate/form`        | POST   | Yes  | Generate lottery number combinations. |
| `/api/generate/statistics`  | POST   | Yes  | Calculate frequent pairs/groups.     |
| `/api/generate/analyze`     | POST   | Yes  | Analyze user-selected numbers.       |

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
  "context": { "formType": 1 }
}
```

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
| `/api/agent/llm-configs/{configId}/activate` | PUT | Activate a stored configuration by id.                  |
| `/api/agent/llm-configs/{configId}/test`  | POST   | Smoke-test a stored configuration.                      |
| `/api/agent/llm-configs/{configId}`       | DELETE | Delete a stored configuration.                          |
| `/api/agent/llm-models?provider=ollama`   | GET    | List models available from a provider.                  |
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
