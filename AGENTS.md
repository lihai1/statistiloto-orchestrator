# Statistiloto — Orchestrator Repo

Monorepo orchestrating 9 Docker Compose services via 5 git submodules. This repo
holds only orchestration: compose files, Traefik config, Keycloak realm, DB init,
and a Makefile. All application code lives in submodules.

## Services (docker-compose.yml)

| Service   | Image / Build                           | Port      | Submodule               | DB schema                        |
|-----------|-----------------------------------------|-----------|-------------------------|----------------------------------|
| `proxy`   | traefik:v3.2                            | 80,443    | — (config in `proxy/`)  | —                                |
| `ui`      | build `ui-fable/Dockerfile`             | 80        | `ui-fable/`             | —                                |
| `server`  | build `server/Dockerfile`               | 8082      | `server/`               | `app`                            |
| `lottery` | build `lottery-stats-server/Dockerfile` | 8080,9090 | `lottery-stats-server/` | `lottery`                        |
| `agent`   | build `agent/Dockerfile`                | 8000      | `agent/`                | `agent`                          |
| `ollama`  | ollama/ollama:0.32.5                    | 11434     | —                       | —                                |
| `auth`    | keycloak:25.0                           | 8080      | — (realm in `auth/`)    | `keycloak`                       |
| `db`      | pgvector/pgvector:pg16                  | 5432      | — (init in `db/`)       | shared (4 schemas)               |
| `redis`   | redis:7.4-alpine                        | 6379      | —                       | — (stream relay, no persistent state) |

Request flow: Browser → Traefik → (`/` ui, `/api/*` server, `/auth/*` auth).
The agent is **not** exposed directly by Traefik — the UI reaches it through
the Java BFF's `/api/agent/*` proxy (HTTP to the agent container on :8000).
Server → gRPC :9090 → lottery. Agent → gRPC :9090 → lottery, HTTP → ollama,
HTTP → server (tool calls); Server → HTTP :8000 → agent (chat/approve proxy).
Agent SSE streaming is relayed through Redis Streams: the agent appends events
to the `agent:stream:{thread_id}:{run_id}` stream (XADD + 1h expiry) and the Java BFF
replays them via XREAD and re-emits as SSE (falls back to inline SSE when Redis
is unavailable). Events: `progress`, `token`, `heartbeat`, `paused`, `done`,
`error` — exactly one terminal event per run.

## Submodules

| Path                    | Repo                                              |
|-------------------------|---------------------------------------------------|
| `lottery-stats-server/` | `git@github.com:lihai1/stat-tree-server.git`      |
| `agent/`                | `git@github.com:lihai1/statistiloto-agent.git`    |
| `ui/`                   | `git@github.com:lihai1/statistiloto-ui.git`       |
| `ui-fable/`             | `git@github.com:lihai1/statistiloto-ui-fable.git` |
| `server/`               | `git@github.com:lihai1/statistiloto-server.git`   |
| `proto/`                | `git@github.com:lihai1/statistiloto-proto.git`    |

## Common Makefile targets

```bash
make setup          # one-shot: submodules + .env + TLS certs
make up             # build + start detached (uses docker-compose.yml)
make up-dev         # dev compose
make up-prod        # prod compose (docker-compose.prod.yml)
make up-ngrok       # ngrok override (docker-compose.ngrok.yml) — dynamic Keycloak hostname for public tunnel
make ps             # containers + health
make health         # formatted health table
make wait           # wait for all healthy
make logs-SERVICE   # tail one service (e.g. make logs-server)
make test           # all unit/integration tests
make test-go test-java test-ui test-agent
make test-e2e       # Playwright (stack must be running)
make test-e2e-login # Playwright login sanity only
make screenshots    # regenerate ui-fable screenshot tour (docs/screenshots/)
make proto          # regenerate Go + Java + Python stubs from proto/
make proto-go proto-java proto-python
make shell-SERVICE  # open shell in a service
make db-shell       # psql
make db-backup      # dump to backup.sql
make db-restore FILE=f.sql
make restart-SERVICE
make scale-server N=2
make clean          # containers (keep volumes)
make clean-volumes  # DESTRUCTIVE: containers + volumes
```

## Cross-service changes (proto/lottery.proto)

`proto/lottery.proto` is the single source of truth for the Java↔Go gRPC contract.
When changing it:

1. Inspect consumers in `server/` and `lottery-stats-server/` and `agent/`.
2. Edit `proto/lottery.proto`.
3. `make proto-go` (regenerates Go stubs in `lottery-stats-server/pkg/gen/` via
   a standalone `Dockerfile.proto` builder image).
4. `make proto-java` (regenerates Java stubs in `server/build/generated/` via
   `gradle generateProto` in a `gradle:8.10.2-jdk21` container).
5. `make proto-python` (regenerates Python stubs in `agent/app/gen/` via the
   agent runtime image which has `grpc_tools` installed).
6. Update all three implementations.
7. `make test-go && make test-java && make test-agent`.

`make proto` runs steps 3–5 together; each uses a standalone container so the
full stack does not need to be running. Do not duplicate protobuf DTO
definitions in any service.

## Local dev

```bash
cp .env.example .env   # set POSTGRES_PASSWORD, KEYCLOAK_ADMIN_PASSWORD, etc.
make up           # dev stack — HTTP on :80 (no TLS needed)
# open http://localhost/  (dev)
# For HTTPS/prod: cd proxy && ./generate-cert.sh && cd ..  then  make up-prod
# open https://localhost/  (accept self-signed cert)
# For a public ngrok tunnel:
#   make up-ngrok   (auto-starts ngrok http 80 if not running, reads the tunnel
#   URL from the ngrok API, and syncs KEYCLOAK_ISSUER in
#   docker-compose.ngrok.yml so the Go service's issuer validation matches the
#   public host; also clears KC_HOSTNAME + sets KC_PROXY_HEADERS=xforwarded so
#   OIDC uses the ngrok host)
```

Test users (change passwords in production):
- `admin@statistiloto.local` / `admin-password-change-me` — USER, ADMIN
- `user@statistiloto.local`  / `user-password-change-me`  — USER (free)
- `paid@statistiloto.local`  / `paid-password-change-me`  — USER, PAID

## Directory map

- `proxy/` — Traefik static + dynamic config, cert generation script.
- `auth/realm-statistiloto.dev.json` — Keycloak realm for dev (open redirect URIs, `http://*/*`).
- `auth/realm-statistiloto.prod.json` — Keycloak realm for prod (locked to `https://statistiloto.example.com`, `sslRequired: external`). **Edit the placeholder domain before deploying.**
- `db/init-schemas.sh` + `db/init.sql` — creates 4 schemas (`keycloak`, `app`, `lottery`, `agent`).
- `docs/` — ARCHITECTURE.md, API.md, FLOWS.md, REQUIREMENTS.md, runbook.md, PLAN.md.

## Gotchas

- Each service owns its own PostgreSQL schema — no shared tables. Boundaries enforced by schema, not by separate DBs.
- `db/init-schemas.sh` runs once on fresh DB only; it is NOT a migration tool.
- Submodule commits: edit inside the submodule, commit & push there, then `git add <submodule>` in this repo and commit the pointer bump.
- Traefik ForwardAuth hits `server`'s `/api/auth/verify` — if server is down, all `/api/*` returns 401 even for valid tokens.
- Go lottery service auth: `KEYCLOAK_ISSUER=""` in `docker-compose.yml` (issuer validation disabled — Keycloak issues tokens with the external-facing URL which varies by deployment; signature + audience `statistiloto-ui` are still validated against JWKS). The ngrok override sets `KEYCLOAK_ISSUER` to the public tunnel URL to restore issuer validation. The agent (`AUDIENCE=statistiloto-ui`) and BFF forward the same JWT.
- Keycloak Account Console (`/auth/realms/statistiloto/account/`) is admin-only via the `account-admin-only` browser flow (`conditional-user-role` = `ADMIN`). Regular users use the Angular profile page + `/api/user/*`; account deletion is a soft-archive (see `docs/ADR-002-account-soft-archive.md`).
- WSL: if `docker` fails with permission errors, run once per session: `sudo usermod -aG docker "$(whoami)"` then reopen shell.
- Prod compose (`docker-compose.prod.yml`) is an *override* on top of `docker-compose.yml`: it enables Traefik TLS on :443 (mounting `proxy/certs` + `traefik.prod.yml`/`dynamic.prod.yml`), switches Keycloak to `start` (prod mode), sets `restart: always`, adds `deploy.resources` limits, disables `LOTTERY_SEED_ON_BOOT`, and tightens the Ollama queue. It does **not** swap in pre-built registry images — `build:` contexts are still inherited from the base file.
- ngrok compose (`docker-compose.ngrok.yml`) is an *override* on top of `docker-compose.yml`: it clears `KC_HOSTNAME` (so Keycloak uses the request `Host` header dynamically) and sets `KC_PROXY_HEADERS=xforwarded` so OIDC issuer/redirect URLs resolve to the public ngrok host, and sets `KEYCLOAK_ISSUER` on the `lottery` service to the public tunnel URL so the Go service's issuer validation matches. `make up-ngrok` auto-starts `ngrok http 80` on the host if no tunnel is running (log at `/tmp/ngrok.log`), reads the public URL from the ngrok API, and rewrites `KEYCLOAK_ISSUER` in the override file to match. Safe because ngrok terminates TLS, so Secure cookies are correct.
- The Java BFF schema (`app`) is Flyway-managed inside the `server` submodule. `V2__add_archive_window_to_user_profile.sql` adds `archive_from`/`archive_to` columns to `app.user_profile` (persisted per-user archive date range). `V3__create_saved_simulations.sql` creates `app.saved_simulations` (bookmarked Simulate results per user). `V4__create_feedback.sql` creates `app.feedback` (user feedback + lottery suggestions, admin-managed). `V5__add_archived_at.sql` adds nullable `archived_at` columns + partial indexes to all four user-owned tables (soft-archive support). `V6__add_result_json_to_saved_simulations.sql` adds `result_json` JSONB to `app.saved_simulations` (stores the full SimulateResultResponse for rich re-rendering in the Saved Sims tab). Flyway runs on server boot; `db/init-schemas.sh` only creates the schema, not these columns/tables.
- Redis (`redis:7.4-alpine`) is shared by the Java BFF and the Python agent for async SSE streaming relay (Redis Stream `agent:stream:{thread_id}:{run_id}`). It holds no persistent application state — `maxmemory 256mb`, `volatile-lru` (stream keys carry a 1h TTL so only marked keys are evictable), `appendonly no`. Both `server` and `agent` gate startup on `redis: service_healthy`. The agent's `app/redis_client.py` and the BFF's `AgentClientService` degrade gracefully to inline SSE if Redis is unavailable (`REDIS_URL` unset or connection failure).

## Verification (full-stack feature)

Angular → Java REST → Java service → Go gRPC → DB → response → Angular UI.
Use `make test-e2e` (Playwright) for the final user-visible flow.
