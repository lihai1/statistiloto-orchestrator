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
| `redis`   | redis:7.4-alpine                        | 6379      | —                       | — (pub/sub, no persistent state) |

Request flow: Browser → Traefik → (`/` ui, `/api/*` server, `/auth/*` auth).
The agent is **not** exposed directly by Traefik — the UI reaches it through
the Java BFF's `/api/agent/*` proxy (HTTP to the agent container on :8000).
Server → gRPC :9090 → lottery. Agent → gRPC :9090 → lottery, HTTP → ollama,
HTTP → server (tool calls); Server → HTTP :8000 → agent (chat/approve proxy).
Agent SSE streaming is relayed through Redis pub/sub: the agent publishes
events to `agent:stream:{thread_id}` and the Java BFF subscribes and re-emits
them as SSE (falls back to inline SSE when Redis is unavailable).

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
make proto          # regenerate Go + Java stubs from proto/
make proto-go proto-java
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
3. `make proto-go` (regenerates Go stubs in `lottery-stats-server/pkg/gen/`).
4. `make proto-java` (regenerates Java stubs in `server/build/generated/`).
5. Agent Python stubs: see `agent/AGENTS.md`.
6. Update all three implementations.
7. `make test-go && make test-java && make test-agent`.

Do not duplicate protobuf DTO definitions in any service.

## Local dev

```bash
cp .env.example .env   # set POSTGRES_PASSWORD, KEYCLOAK_ADMIN_PASSWORD, etc.
make up           # dev stack — HTTP on :80 (no TLS needed)
# open http://localhost/  (dev)
# For HTTPS/prod: cd proxy && ./generate-cert.sh && cd ..  then  make up-prod
# open https://localhost/  (accept self-signed cert)
# For a public ngrok tunnel: run `ngrok http 80` separately, then
#   make up-ngrok   (docker-compose.ngrok.yml clears KC_HOSTNAME +
#   sets KC_PROXY_HEADERS=xforwarded so OIDC uses the ngrok host)
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
- WSL: if `docker` fails with permission errors, run once per session: `sudo usermod -aG docker "$(whoami)"` then reopen shell.
- Prod compose (`docker-compose.prod.yml`) is an *override* on top of `docker-compose.yml`: it enables Traefik TLS on :443 (mounting `proxy/certs` + `traefik.prod.yml`/`dynamic.prod.yml`), switches Keycloak to `start` (prod mode), sets `restart: always`, adds `deploy.resources` limits, disables `LOTTERY_SEED_ON_BOOT`, and tightens the Ollama queue. It does **not** swap in pre-built registry images — `build:` contexts are still inherited from the base file.
- ngrok compose (`docker-compose.ngrok.yml`) is an *override* on top of `docker-compose.yml`: it clears `KC_HOSTNAME` (so Keycloak uses the request `Host` header dynamically) and sets `KC_PROXY_HEADERS=xforwarded` so OIDC issuer/redirect URLs resolve to the public ngrok host. Run `ngrok http 80` separately — the override does not start the tunnel. Safe because ngrok terminates TLS, so Secure cookies are correct.
- The Java BFF schema (`app`) is Flyway-managed inside the `server` submodule. `V2__add_archive_window_to_user_profile.sql` adds `archive_from`/`archive_to` columns to `app.user_profile` (persisted per-user archive date range). `V3__create_saved_simulations.sql` creates `app.saved_simulations` (bookmarked Simulate results per user). `V4__create_feedback.sql` creates `app.feedback` (user feedback + lottery suggestions, admin-managed). Flyway runs on server boot; `db/init-schemas.sh` only creates the schema, not these columns/tables.
- Redis (`redis:7.4-alpine`) is shared by the Java BFF and the Python agent for async SSE streaming relay (pub/sub channel `agent:stream:{thread_id}`). It holds no persistent application state — `maxmemory 256mb`, `allkeys-lru`, `appendonly no`. Both `server` and `agent` gate startup on `redis: service_healthy`. The agent's `app/redis_client.py` and the BFF's `AgentClientService` degrade gracefully to inline SSE if Redis is unavailable (`REDIS_URL` unset or connection failure).

## Verification (full-stack feature)

Angular → Java REST → Java service → Go gRPC → DB → response → Angular UI.
Use `make test-e2e` (Playwright) for the final user-visible flow.
