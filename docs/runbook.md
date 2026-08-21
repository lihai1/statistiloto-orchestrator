# Statistiloto-New — Runbook

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, KEYCLOAK_ADMIN_PASSWORD, etc.

# 2. Generate local TLS certs (development only)
cd proxy && ./generate-cert.sh && cd ..

# 3. Build and start the full stack
docker compose up -d --build

# 4. Check health
docker compose ps
docker compose logs -f
```

## Service Endpoints (local)

| URL                              | Service  |
|----------------------------------|----------|
| https://localhost/               | Angular UI |
| https://localhost/auth/          | Keycloak admin |
| https://localhost/api/...        | Java BFF |
| https://localhost/swagger-ui.html| Java OpenAPI |

> The browser will warn about the self-signed cert. Accept it for local dev.

## Keycloak

- Admin console: `https://localhost/auth/admin`
- Credentials: from `.env` (`KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`)
- Realm `statistiloto` is imported on first boot from `auth/realm-statistiloto.json`
- Test user: `testuser` / `testpass` (defined in the realm import)

## Database

```bash
# Connect to Postgres
docker compose exec db psql -U statistiloto -d statistiloto

# Inspect schemas
\dn
\dt keycloak.*
\dt app.*
\dt lottery.*
```

## Running Tests

### Go service
```bash
docker compose exec lottery go test ./...
```

### Java BFF
```bash
docker compose exec server ./gradlew test
```

### Angular UI
```bash
docker compose exec ui npm test
```

### Playwright E2E
```bash
cd ui && npx playwright test
```

## Scaling

```bash
# Scale stateless services
docker compose up --scale server=2 --scale lottery=2
```

## Troubleshooting

### Keycloak realm not imported
- Ensure `auth/realm-statistiloto.json` is mounted.
- Check `docker compose logs auth`.

### JWT validation fails
- Verify `KEYCLOAK_ISSUER` matches the realm URL reachable from the service.
- Inside Docker, services use `http://auth:8080/realms/statistiloto`.
- The browser uses `https://localhost/auth/realms/statistiloto` (through Traefik).

### 429 Too Many Requests
- Traefik rate limiting is active. Reduce request frequency.
- Adjust limits in `proxy/dynamic.yml`.

### Proto changes
When modifying `proto/lottery.proto`:
1. Regenerate Go stubs: `docker compose exec lottery make proto`
2. Regenerate Java stubs: `docker compose exec server ./gradlew generateProto`
3. Update both service implementations.
4. Run tests for both services.

## Backup & Recovery

```bash
# Backup the database
docker compose exec db pg_dump -U statistiloto statistiloto > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U statistiloto statistiloto
```
