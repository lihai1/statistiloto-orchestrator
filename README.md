# Statistiloto

A modernized, stateless, horizontally scalable, and secured reimplementation of the
[Statistiloto](https://github.com/lihai1) Israeli-lottery analysis platform.
Eight containerized services orchestrated by Docker Compose, with five application
submodules managed via git.

## Architecture

```mermaid
flowchart TB
    Browser[Browser / PWA<br/>Angular 20]

    subgraph Edge
        Proxy[Traefik v3.2<br/>TLS · routing · rate limit · ForwardAuth]
    end

    subgraph Application
        UI[Angular PWA<br/>Nginx static]
        Server[Java Spring Boot BFF<br/>OAuth2 Resource Server · gRPC client]
        Agent[Python LangGraph Agent<br/>LLM · RAG · HITL]
    end

    subgraph Compute
        Lottery[Go lottery-stats-server<br/>algorithm · scraper · gRPC + REST]
        Ollama[Ollama<br/>local LLM inference]
    end

    subgraph Platform
        Auth[Keycloak 25<br/>OIDC · JWT issuance]
        DB[(PostgreSQL 16<br/>pgvector<br/>schemas: keycloak · app · lottery · agent)]
    end

    Browser -->|HTTP (dev) / HTTPS (prod)| Proxy
    Proxy -->|/auth/*| Auth
    Proxy -->|/api/*| Server
    Proxy -->|/| UI
    Server -->|HTTP :8000| Agent
    Server -->|gRPC :9090| Lottery
    Agent -->|gRPC :9090| Lottery
    Agent -->|HTTP| Ollama
    Agent -->|HTTP| Server
    Server -->|JDBC| DB
    Lottery -->|pgx| DB
    Agent -->|psycopg| DB
    Auth -->|JDBC| DB
    Lottery -.->|scheduled scraper| Web[(Israeli lottery site)]
```

### Services

| Service   | Tech                        | Submodule / Repo                                          | Port(s)       | DB Schema Owned         |
|-----------|-----------------------------|-----------------------------------------------------------|---------------|-------------------------|
| `proxy`   | Traefik v3.2                | — (config in `proxy/`)                                    | 80, 443       | —                       |
| `ui`      | Angular 20 PWA + Nginx      | `ui/` → `statistiloto-ui`                                 | 80 (internal) | —                       |
| `server`  | Java 21 / Spring Boot 3.5   | `server/` → `statistiloto-server`                         | 8082          | `app`                   |
| `lottery` | Go 1.25                     | `lottery-stats-server/` → `stat-tree-server`              | 8080, 9090    | `lottery`               |
| `agent`   | Python 3.12 / LangGraph     | `agent/` → `statistiloto-agent`                           | 8000          | `agent`                 |
| `ollama`  | Ollama 0.32.5               | — (official image)                                        | 11434         | —                       |
| `auth`    | Keycloak 25                 | — (realm export in `auth/`)                               | 8080          | `keycloak`              |
| `db`      | PostgreSQL 16 + pgvector    | — (init scripts in `db/`)                                 | 5432          | shared (4 schemas)      |

### Data Ownership

Each service owns its own PostgreSQL schema — no shared tables, boundaries enforced by schema:

- **Keycloak** (`keycloak`) — users, credentials, sessions, realm data.
- **Java BFF** (`app`) — user profiles, saved numbers (Flyway-managed).
- **Go service** (`lottery`) — `lottery_results` table (historical draws, scraper-managed).
- **Python agent** (`agent`) — `token_usage`, `audit_log`, `llm_config`, `embeddings` (pgvector).

## Features

- **Generate** — tree-based lottery number combinations from historical-draw patterns.
- **Lucky Numbers** — willBe front-loading via ReGroup.
- **Statistics** — frequent number pairs/groups over a configurable date range.
- **Analyze** — frequency groups and historical matches for user-selected numbers.
- **Simulate** — backtest a ticket (6/8/10/12-number systematic forms) against every
  historical draw in an archive window: lifetime spend vs. winnings, per-tier hit
  counts, and per-draw results. Prize amounts use scraped per-draw data when
  available (`lottery_results.prize_amounts`), falling back to defaults or
  user-supplied overrides.
- **Saved Numbers** — per-user CRUD for generated/favorite sets.
- **AI Assistant** — LangGraph agent (SSE streaming) with lottery tools, RAG, and
  human-in-the-loop approval on write tools. Per-request LLM override
  (`config_id`) and language hint (`lang`) on chat.
- **Admin** — runtime LLM configuration (stored configs CRUD + activate/test),
  free-tier LLM toggle, token usage, audit log, scraper control, RAG reindex.

## Quick Start

```bash
# 1. Clone with submodules
git clone --recurse-submodules <this-repo-url> statistiloto-new
cd statistiloto-new

# 2. Configure environment
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, KEYCLOAK_ADMIN_PASSWORD, etc.

# 3. (Prod/HTTPS only) Generate local TLS certs.
#    The dev stack (docker-compose.yml) is HTTP-only on :80;
#    certs are only loaded by docker-compose.prod.yml / traefik.prod.yml.
cd proxy && ./generate-cert.sh && cd ..

# 4. Build and start the full stack
make up          # or: docker compose up -d --build

# 5. Check health
make ps          # or: docker compose ps
make wait        # wait until every service is healthy
```

Then open **http://localhost/** (dev stack, HTTP).

> The dev stack is reachable from any host that can route to the Docker host —
> including LAN IPs (e.g. `http://192.168.1.140/`) and Devin browser previews.
> Traefik's dev `dynamic.yml` routes by path prefix (not `Host`), and Keycloak
> runs with `KC_HOSTNAME_STRICT: false` so it resolves its hostname from the
> incoming request. The dev realm (`auth/realm-statistiloto.dev.json`) allows
> `http://*/*` and `https://*/*` redirect URIs for this reason.

> For the production override (`make up-prod` / `docker compose -f
> docker-compose.yml -f docker-compose.prod.yml up -d`), Traefik enables
> TLS on :443 — open **https://localhost/** and accept the self-signed cert.
> The prod realm (`auth/realm-statistiloto.prod.json`) locks `redirectUris` to
> `https://statistiloto.example.com/*` and sets `sslRequired: external` —
> **edit the placeholder domain before deploying.**

### Test Users

The Keycloak realm is pre-provisioned with three test users (change passwords in production):

| User                       | Password                | Roles        | Tier |
|----------------------------|-------------------------|--------------|------|
| `admin@statistiloto.local` | `admin-password-change-me` | USER, ADMIN | Admin |
| `user@statistiloto.local`  | `user-password-change-me`  | USER        | Free  |
| `paid@statistiloto.local`  | `paid-password-change-me`  | USER, PAID  | Paid  |

## Submodules

This orchestrator repo uses git submodules for all application code:

| Submodule                | Path                      | Repository URL                                      | Description                                    |
|--------------------------|---------------------------|-----------------------------------------------------|------------------------------------------------|
| `lottery-stats-server`   | `lottery-stats-server/`   | `git@github.com:lihai1/stat-tree-server.git`        | Go lottery algorithm + scraper (gRPC + REST)   |
| `agent`                  | `agent/`                  | `git@github.com:lihai1/statistiloto-agent.git`      | Python LangGraph agent worker (LLM, RAG, HITL) |
| `ui`                     | `ui/`                     | `git@github.com:lihai1/statistiloto-ui.git`         | Angular 20 PWA frontend                         |
| `server`                 | `server/`                 | `git@github.com:lihai1/statistiloto-server.git`     | Java Spring Boot BFF                            |
| `proto`                  | `proto/`                  | `git@github.com:lihai1/statistiloto-proto.git`      | Shared protobuf contract (`lottery.proto`)      |

## Development

### Working with submodules

```bash
# Clone with all submodules
git clone --recurse-submodules <repo-url>

# If already cloned without submodules
git submodule update --init --recursive

# Pull latest changes in all submodules
git submodule update --remote --merge

# Make changes inside a submodule
cd lottery-stats-server
# ... edit, commit, push ...
cd ..
git add lottery-stats-server
git commit -m "bump lottery-stats-server submodule"
```

### Shared protobuf contract

The `proto/lottery.proto` file is the single source of truth for the gRPC contract
between the Java BFF, the Go lottery service, and the Python agent. When changing it:

1. `make proto-go`   — regenerate Go stubs in `lottery-stats-server/pkg/gen/`.
2. `make proto-java`  — regenerate Java stubs in `server/build/generated/`.
3. Regenerate agent Python stubs (see `agent/AGENTS.md`).
4. Update all three implementations (`server`, `lottery-stats-server`, `agent`).
5. `make test-go && make test-java && make test-agent`.

> `make proto` runs steps 1–2 together. Do not duplicate protobuf DTO definitions
> in any service.

### Scaling

Java and Go services are stateless and can be scaled horizontally:

```bash
docker compose up --scale server=2 --scale lottery=2
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — service topology, data ownership, auth flow
- [API Reference](docs/API.md) — REST endpoints exposed by the Java BFF
- [Requirements](docs/REQUIREMENTS.md) — functional and non-functional requirements
- [Flows](docs/FLOWS.md) — mermaid diagrams for all major user flows
- [Runbook](docs/runbook.md) — operations, troubleshooting, backup & recovery
- [Plan](docs/PLAN.md) — original architecture plan and implementation steps
- [UI Screenshot Tour](docs/screenshots/SCREENSHOTS.md) — automated Playwright screenshots of every page

## Testing

The Makefile wraps the per-service test commands (`make test-go`,
`make test-java`, `make test-ui`, `make test-agent`, `make test`):

```bash
# All service unit/integration tests
make test

# Individual services
make test-go       # docker compose exec lottery go test ./...
make test-java     # docker compose exec server ./gradlew test
make test-ui       # docker compose exec ui npm test -- --watch=false
make test-agent    # docker compose exec agent make test

# Playwright E2E (stack must be running)
make test-e2e      # cd ui && npx playwright test
make test-e2e-login
```

## License

Private project.
