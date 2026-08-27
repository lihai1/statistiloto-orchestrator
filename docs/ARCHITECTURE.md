# Statistiloto-New — Architecture

## Overview

Statistiloto-New is a modernized, stateless, horizontally scalable
reimplementation of the legacy Statistiloto lottery-analysis project.

```
                ┌────────────┐
                │   Browser  │
                └─────┬──────┘
                      │ HTTP (dev) / HTTPS (prod)
                ┌─────▼──────┐
                │  Traefik   │  TLS, rate-limit, ForwardAuth
                └──┬──┬──┬───┘
                   │  │  │
       ┌───────────┘  │  └─────────────┐
       ▼              ▼                ▼
  ┌─────────┐   ┌─────────┐      ┌──────────┐
  │ Angular │   │  Java   │      │ Keycloak │
  │  PWA    │   │  BFF    │      │   (OIDC) │
  └─────────┘   └────┬────┘      └──────────┘
                     │ gRPC :9090        ▲
                ┌────▼────┐    ┌─────────┴───┐
                │   Go    │    │  Python     │ HTTP :8000
                │ lottery │    │  agent      │◄─── BFF proxy /api/agent/*
                └────┬────┘    └──────┬──────┘
                     │                │ HTTP
                     │ gRPC :9090     ▼
                     │          ┌──────────┐
                     │          │ Ollama   │ local LLM
                     │          └──────────┘
                ┌────▼───────────────────┐
                │PostgreSQL  schemas:    │
                │ keycloak / app /       │
                │ lottery / agent        │
                └────────────────────────┘
```

## Services

| Service  | Tech                  | Owns                                   | Port(s)      |
|----------|-----------------------|----------------------------------------|--------------|
| `proxy`  | Traefik v3.2          | Edge routing, TLS (prod), rate limiting, ForwardAuth | 80 (dev), 443 (prod) |
| `ui`     | Angular 20 PWA + Nginx| Static UI                              | 80 (internal)|
| `server` | Spring Boot 3.5 / Java 21 | App data (`app` schema), BFF REST, agent proxy | 8082     |
| `lottery`| Go 1.25               | Lottery results + algorithm + Simulate backtest (`lottery` schema, incl. `prize_amounts`) | 8080, 9090 |
| `agent`  | Python 3.12 / LangGraph | Agent data (`agent` schema): `token_usage`, `audit_log`, `llm_config`, `chat_sessions`, pgvector `embeddings`; free-tier LLM toggle | 8000 (internal) |
| `ollama` | Ollama 0.32.5         | Local LLM inference (serial)           | 11434 (internal) |
| `auth`   | Keycloak 25           | Identity, JWT issuance (`keycloak` schema) | 8080 (internal) |
| `db`     | PostgreSQL 16 + pgvector | Shared instance, four logical schemas | 5432         |

> Only `proxy` exposes external ports (80 dev / 443 prod). Every other
> service is reachable only on the private `statistiloto-net` Docker network.
> The agent is **not** published by Traefik — the UI reaches it via the
> Java BFF's `/api/agent/*` HTTP proxy.

## Data Ownership

- **Keycloak** owns identity/authentication data (`keycloak` schema).
- **Java BFF** owns application data: saved numbers, user profiles (`app` schema).
- **Go service** owns lottery historical results and computation (`lottery` schema):
  `lottery_results` (including the `prize_amounts` JSONB column populated by the
  prize scraper, used by Simulate for real per-draw prize data).
- **Python agent** owns LLM telemetry and RAG state (`agent` schema):
  `token_usage`, `audit_log`, `llm_config`, `chat_sessions`, and pgvector `embeddings`.
- No service shares tables with another. Boundaries are enforced by schema.

## Authentication Flow

1. Angular uses `keycloak-js` with PKCE to authenticate against Keycloak.
2. Keycloak issues an RS256 JWT.
3. Angular sends the JWT as `Authorization: Bearer` to `/api/*` via Traefik.
4. Traefik calls `ForwardAuth` to the Java BFF's `/api/auth/verify` for edge validation.
5. Java validates the JWT against Keycloak JWKS (Spring OAuth2 Resource Server).
6. Java calls Go via gRPC for computation. Go independently validates the JWT
   against Keycloak JWKS (defense-in-depth).
7. When the UI calls `/api/agent/*`, the Java BFF forwards the JWT to the
   Python agent, which validates it against Keycloak JWKS independently
   (defense-in-depth) before running the LangGraph supervisor.

## Communication

- **Angular → Java**: REST over HTTP (dev) / HTTPS (prod), through Traefik.
- **Java → Go**: gRPC (shared `proto/lottery.proto`): GenerateForm, GetStatistics,
  Analyze, Simulate.
- **Java → Agent**: HTTP (`/api/agent/*` proxy, SSE passthrough for chat).
- **Agent → Go**: gRPC (shared `proto/lottery.proto`, lottery tools).
- **Agent → Ollama**: HTTP (local LLM inference).
- **Agent → Java**: HTTP (write tools such as `save_numbers`).
- **No browser-to-Go traffic. No browser-to-Agent traffic.**

## Statelessness

- Java and Go keep no in-process session state.
- JWTs are validated statelessly via JWKS.
- Any instance can serve any request → horizontal scaling:

```bash
docker compose up --scale server=2 --scale lottery=2
```

## Rate Limiting

Traefik enforces per-IP rate limits (configured in `proxy/dynamic.yml`,
periods expressed **per minute**):

- `/auth/*`: 100 req/min average, 200 burst (`rl-auth`)
- `/api/*`: 60 req/min average, 120 burst (`rl-api`)
- `/lottery/*` (admin/direct, when enabled): 30 req/min average, 60 burst (`rl-lottery`)

> The `/lottery/*` router is defined as a middleware but is not wired to a
> Traefik router in the default dev `dynamic.yml` — the Go REST gateway is
> reachable only on the internal network. Enable it explicitly if you expose
> the Go service directly.
