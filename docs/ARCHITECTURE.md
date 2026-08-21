# Statistiloto-New — Architecture

## Overview

Statistiloto-New is a modernized, stateless, horizontally scalable
reimplementation of the legacy Statistiloto lottery-analysis project.

```
                ┌────────────┐
                │   Browser  │
                └─────┬──────┘
                      │ HTTPS
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
                     │ gRPC
                ┌────▼────┐
                │   Go    │  algorithm + scraper
                │ lottery │
                └────┬────┘
                     │
                ┌────▼────┐
                │PostgreSQL│  schemas: keycloak / app / lottery
                └─────────┘
```

## Services

| Service  | Tech                  | Owns                                   | Port(s)      |
|----------|-----------------------|----------------------------------------|--------------|
| `proxy`  | Traefik v3            | Edge routing, TLS, rate limiting       | 80, 443     |
| `ui`     | Angular 20 PWA + Nginx| Static UI                              | 80 (internal)|
| `server` | Spring Boot 3.5 / Java 21 | App data (`app` schema), BFF REST | 8082         |
| `lottery`| Go 1.25               | Lottery results + algorithm (`lottery` schema) | 8080, 9090 |
| `auth`   | Keycloak 25           | Identity, JWT issuance (`keycloak` schema) | 8080     |
| `db`     | PostgreSQL 16         | Shared instance, separate schemas      | 5432         |

## Data Ownership

- **Keycloak** owns identity/authentication data (`keycloak` schema).
- **Java BFF** owns application data: saved numbers, user profiles (`app` schema).
- **Go service** owns lottery historical results and computation (`lottery` schema).
- No service shares tables with another. Boundaries are enforced by schema.

## Authentication Flow

1. Angular uses `keycloak-js` with PKCE to authenticate against Keycloak.
2. Keycloak issues an RS256 JWT.
3. Angular sends the JWT as `Authorization: Bearer` to `/api/*` via Traefik.
4. Traefik calls `ForwardAuth` to the Java BFF's `/api/auth/verify` for edge validation.
5. Java validates the JWT against Keycloak JWKS (Spring OAuth2 Resource Server).
6. Java calls Go via gRPC for computation. Go independently validates the JWT
   against Keycloak JWKS (defense-in-depth).

## Communication

- **Angular → Java**: REST over HTTPS (through Traefik).
- **Java → Go**: gRPC (shared `proto/lottery.proto`).
- **No browser-to-Go traffic.**

## Statelessness

- Java and Go keep no in-process session state.
- JWTs are validated statelessly via JWKS.
- Any instance can serve any request → horizontal scaling:

```bash
docker compose up --scale server=2 --scale lottery=2
```

## Rate Limiting

Traefik enforces per-IP rate limits:
- `/auth/*`: 10 req/s average, 20 burst
- `/api/*`: 60 req/s average, 120 burst
- `/lottery/*` (admin): 30 req/s average, 60 burst
