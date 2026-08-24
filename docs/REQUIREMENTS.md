# Statistiloto — Requirements

Derived from [PLAN.md](PLAN.md), [ARCHITECTURE.md](ARCHITECTURE.md),
[API.md](API.md), [runbook.md](runbook.md), and the actual
`docker-compose.yml` implementation (source of truth).

---

## Functional Requirements

### Lottery Analysis
- **FR-1** Generate lottery number combinations from historical-draw patterns
  (tree-based algorithm, frequency-ranked tries, backtracking search).
- **FR-2** Calculate statistics — frequent number pairs/groups over a
  configurable date range.
- **FR-3** Analyze user-selected numbers against historical winning draws,
  returning frequency groups and match details.
- **FR-4** Generate "lucky" numbers (willBe front-loading via ReGroup).

### User Data
- **FR-5** Save and manage generated/favorite number sets per user account
  (CRUD: create, list, delete).
- **FR-6** Retrieve the authenticated user's profile (`/api/me`).

### AI Agent
- **FR-7** Chat with an AI assistant (SSE streaming) that can call lottery
  tools, retrieve RAG context, and trigger writes with human approval (HITL).
- **FR-8** Admin operations: configure LLM at runtime, trigger scraper,
  view audit log, view token usage.

### Authentication
- **FR-9** Users log in via Keycloak (OIDC authorization-code + PKCE).
- **FR-10** Three tiers: Free, Paid, Admin (owner/developer super-user).
- **FR-11** JWTs validated at the edge (Traefik ForwardAuth) and in each
  service (defense-in-depth).

### Data Freshness
- **FR-12** Scheduled scraper refreshes `lottery_results` from the Israeli
  lottery site (pais.co.il) on a cron schedule (default: daily 03:00).
- **FR-13** Seed from `lotto.data` on first boot if the table is empty.

---

## Non-Functional Requirements

### Scalability
- **NFR-1** All application services are stateless — any instance can serve
  any request. Horizontal scaling via `docker compose up --scale`.
- **NFR-2** JWT validation is stateless (JWKS, no shared session store).
- **NFR-3** Database connection pooling (HikariCP for Java, pgx pool for Go,
  psycopg pool for Python).

### Security
- **NFR-4** TLS termination at Traefik edge proxy; internal traffic is
  plaintext over the private Docker network.
- **NFR-5** Rate limiting at the edge: `/auth/*` (10 req/s, burst 20),
  `/api/*` (60 req/s, burst 120), `/lottery/*` (30 req/s, burst 60).
- **NFR-6** No service shares database tables with another; boundaries
  enforced by PostgreSQL schema isolation.
- **NFR-7** No passwords stored in application databases — Keycloak owns
  identity and credentials.
- **NFR-8** Secrets via `.env` (gitignored); `.env.example` contains only
  placeholders.

### Availability
- **NFR-9** Health checks for every service; Compose `depends_on` with
  `condition: service_healthy` ensures correct startup ordering.
- **NFR-10** Services restart automatically (`restart: unless-stopped`).

### Observability
- **NFR-11** Java BFF exposes Actuator health/info/metrics endpoints.
- **NFR-12** Go service exposes `/health` with `draws_loaded` count.
- **NFR-13** Agent exposes `/healthz`.
- **NFR-14** Springdoc OpenAPI / Swagger UI at `/swagger-ui.html`.

---

## Service-Level Requirements

### proxy (Traefik v3.2)
- Route `/auth/*` → Keycloak, `/api/*` → Java BFF, `/` → Angular UI,
  `/lottery/*` → Go service (admin/direct, optional).
- TLS termination, JWT ForwardAuth, rate limiting, security headers.
- Config in `proxy/traefik.yml` + `proxy/dynamic.yml`.

### ui (Angular 20 PWA)
- Standalone components, OnPush change detection, signals.
- Keycloak PKCE auth, JWT interceptor, route guards.
- Talks ONLY to the Java BFF at `/api/*` — never to Go directly.
- PWA: service worker, installable, offline shell.
- Hebrew i18n (Transloco/runtime).

### server (Java Spring Boot 3.5 BFF)
- OAuth2 Resource Server (Keycloak JWKS), audience validation.
- REST API for all UI-facing endpoints.
- gRPC client to Go lottery service for all computation.
- HTTP proxy to Agent service for chat/approve (SSE passthrough).
- Owns `app` schema (Flyway): `user_profile`, `saved_numbers`.
- Port 8082.

### lottery (Go 1.25)
- gRPC + gRPC-Gateway (REST).
- Tree-based LotteryArray algorithm (ported from Java, behavior preserved).
- Stateless beyond `lottery_results` table.
- Keycloak JWT validation (defense-in-depth, RS256/JWKS).
- Scheduled scraper + seeder.
- Owns `lottery` schema (Liquibase).
- Ports 8080 (REST gateway), 9090 (gRPC).

### agent (Python LangGraph)
- FastAPI with SSE streaming.
- Supervisor graph → 3 workers (nl_assistant, analyst, admin_ops).
- RAG with pgvector (role-scoped, per-tenant).
- HITL on write tools (save_numbers, trigger_scraper).
- Token metering (agent.token_usage).
- gRPC to Go lottery, HTTP to Java BFF.
- Owns `agent` schema (pgvector).
- Port 8000.

### auth (Keycloak 25)
- OIDC issuer, JWT issuance (RS256).
- Realm `statistiloto` with clients: `statistiloto-ui` (public, PKCE),
  `statistiloto-server` (confidential).
- Roles: USER, PAID, ADMIN.
- Owns `keycloak` schema.
- Port 8080 (internal).

### db (PostgreSQL 16 + pgvector)
- Single instance, four logical schemas: `keycloak`, `app`, `lottery`, `agent`.
- Init scripts create schemas + grants on first boot.
- Seed mount for `lotto.data`.
- pgvector extension for agent embeddings.

### ollama (Ollama 0.32.5)
- Local LLM inference (serial: 1 parallel request, 2 loaded models).
- Used by the agent service in development.
- Port 11434 (internal).

---

## Infrastructure Requirements

### Networking
- Private Docker bridge network `statistiloto-net`.
- Only Traefik exposes external ports (80/443).
- All inter-service communication over the private network.

### Database
- pgvector image (`pgvector/pgvector:pg16`) for embedding support.
- Schema bootstrap via `db/init-schemas.sh` + `db/init.sql`.
- Agent schema via `agent/db/init-agent.sql`.
- Persistent volume `postgres_data`.

### TLS
- Self-signed certs for local dev via `proxy/generate-cert.sh`.
- Production: Let's Encrypt or external cert manager.

---

## Constraints

- **Israeli lottery** — data format and source site (pais.co.il) are specific
  to the Israeli lottery.
- **Hebrew UI** — primary language is Hebrew; i18n must preserve Hebrew strings
  and support RTL.
- **Git submodules** — all application code lives in separate repos, linked via
  submodules. Clone with `--recurse-submodules`.
- **Shared proto** — `proto/lottery.proto` is the single source of truth for
  Java↔Go contracts. No duplicated protobuf definitions.
- **Algorithm preservation** — the core lottery-tree algorithm behavior must
  not change unless explicitly required.
