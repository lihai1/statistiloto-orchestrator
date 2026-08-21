# Traefik edge proxy for Statistiloto.

Single entry point for all external traffic. Responsibilities:

- **TLS termination** (self-signed cert for local dev; ACME for prod).
- **Routing**: `/auth/*` → Keycloak, `/api/*` → Java BFF, `/lottery/*` → Go
  service (admin/direct), `/` → Angular PWA.
- **Rate limiting**: per-IP token buckets, stricter on auth endpoints.
- **Edge JWT validation** (defense-in-depth): a `ForwardAuth` middleware calls
  the Java BFF's stateless `/api/auth/verify` endpoint, which validates the
  Bearer token against Keycloak JWKS. Backends re-validate independently.

## Files

- `traefik.yml` — static config (entrypoints, providers, logging).
- `dynamic.yml` — dynamic config (middlewares, file-based routers/services).
- `generate-cert.sh` — creates `certs/local.{crt,key}` for local HTTPS.

## Local setup

```bash
./generate-cert.sh          # one-time
docker compose up -d proxy  # or `docker compose up -d` for the whole stack
```

Dashboard: `https://localhost:8081` (bound to the `traefik` entrypoint).

## Adding a new backend

Prefer Docker Compose labels on the service for auto-discovery:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=statistiloto-net"
  - "traefik.http.routers.my-service.rule=Host(`${TRAEFIK_DOMAIN}`) && PathPrefix(`/my-service`)"
  - "traefik.http.routers.my-service.entrypoints=websecure"
  - "traefik.http.routers.my-service.tls=true"
  - "traefik.http.routers.my-service.middlewares=edge-jwt,rl-api"
```

Use file-based routers in `dynamic.yml` only when labels are impractical.
