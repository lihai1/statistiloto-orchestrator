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

## Health & Observability

| Endpoint                | Service | Description            |
|-------------------------|---------|------------------------|
| `/actuator/health`      | Java    | Liveness/readiness     |
| `/health`               | Go      | Liveness               |
| `/realms/statistiloto`  | Keycloak| OIDC issuer            |
