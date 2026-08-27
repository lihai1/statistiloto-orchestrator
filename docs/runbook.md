# Statistiloto-New — Runbook

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, KEYCLOAK_ADMIN_PASSWORD, etc.

# 2. (Prod/HTTPS only) Generate local TLS certs.
#    The dev stack is HTTP-only on :80; certs are only loaded by the prod override.
cd proxy && ./generate-cert.sh && cd ..

# 3. Build and start the full stack
make up          # or: docker compose up -d --build

# 4. Check health
make ps          # or: docker compose ps
make wait        # wait until every service is healthy
docker compose logs -f
```

> The Makefile wraps the common compose commands (`make up`, `make ps`,
> `make wait`, `make logs-<svc>`, `make db-shell`, `make db-backup`, etc.).
> See `make help` or `AGENTS.md` for the full target list.

## Service Endpoints (local dev — HTTP)

| URL                              | Service  |
|----------------------------------|----------|
| http://localhost/                | Angular UI |
| http://localhost/auth/           | Keycloak admin |
| http://localhost/api/...         | Java BFF |
| http://localhost/swagger-ui.html | Java OpenAPI |

> The dev stack (`docker-compose.yml`) is HTTP on :80. For HTTPS, run the
> production override (`make up-prod`) which enables Traefik TLS on :443 —
> then open **https://localhost/** and accept the self-signed cert.

## Keycloak

- Admin console: `http://localhost/auth/admin` (dev) / `https://localhost/auth/admin` (prod)
- Credentials: from `.env` (`KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`)
- Realm `statistiloto` is imported on first boot from `auth/realm-statistiloto.dev.json` (dev) or `auth/realm-statistiloto.prod.json` (prod)
- Test users (defined in the realm import — change passwords in production):
  - `admin@statistiloto.local` / `admin-password-change-me` — USER, ADMIN
  - `user@statistiloto.local`  / `user-password-change-me`  — USER (free)
  - `paid@statistiloto.local`  / `paid-password-change-me`  — USER, PAID

## Database

```bash
# Connect to Postgres
make db-shell     # or: docker compose exec db psql -U statistiloto -d statistiloto

# Inspect schemas
\dn
\dt keycloak.*
\dt app.*
\dt lottery.*
\dt agent.*
```

## Running Tests

The Makefile wraps each service's test command (`make test-go`, `make test-java`,
`make test-ui`, `make test-agent`, `make test` for all, `make test-e2e` for
Playwright).

### Go service
```bash
make test-go   # or: docker compose exec lottery go test ./...
```

### Java BFF
```bash
make test-java   # or: docker compose exec server ./gradlew test
```

### Angular UI
```bash
make test-ui   # or: docker compose exec ui npm test -- --watch=false
```

### Agent
```bash
make test-agent   # or: docker compose exec agent make test
```

### Playwright E2E
```bash
make test-e2e   # or: cd ui && npx playwright test
```

## Scaling

```bash
# Scale stateless services (server + lottery)
make scale                 # server=2 lottery=2
make scale-server N=3      # one service to N
# or: docker compose up --scale server=2 --scale lottery=2
```

## Troubleshooting

### Keycloak realm not imported
- Ensure `auth/realm-statistiloto.dev.json` (dev) or `auth/realm-statistiloto.prod.json` (prod) is mounted.
- Check `docker compose logs auth`.

### JWT validation fails
- Verify `KEYCLOAK_ISSUER` matches the realm URL reachable from the service.
- Inside Docker, services use `http://auth:8080/auth/realms/statistiloto`
  (note the `/auth` context path from `--http-relative-path=/auth`).
- The browser uses `http://localhost/auth/realms/statistiloto` (dev, through
  Traefik) or `https://localhost/auth/realms/statistiloto` (prod).

### 429 Too Many Requests
- Traefik rate limiting is active. Reduce request frequency.
- Adjust limits in `proxy/dynamic.yml` (per-minute averages/bursts).

### Proto changes
When modifying `proto/lottery.proto` (the single source of truth for the
Java↔Go contract, also consumed by the agent):
1. `make proto-go`   — regenerate Go stubs in `lottery-stats-server/pkg/gen/`.
2. `make proto-java` — regenerate Java stubs in `server/build/generated/`.
3. Regenerate agent Python stubs (see `agent/AGENTS.md`).
4. Update all three implementations (`server`, `lottery-stats-server`, `agent`).
5. `make test-go && make test-java && make test-agent`.

> `make proto` runs steps 1–2 together. Do not duplicate protobuf DTO
> definitions in any service.

## Backup & Recovery

```bash
# Backup the database
make db-backup                       # writes backup.sql
# or: docker compose exec db pg_dump -U statistiloto statistiloto > backup.sql

# Restore
make db-restore FILE=backup.sql
# or: cat backup.sql | docker compose exec -T db psql -U statistiloto statistiloto
```
