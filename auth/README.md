# Keycloak customization for Statistiloto.

This directory holds the `statistiloto` realm export imported on first boot via
`--import-realm` (see `../docker-compose.yml`).

## Realm files

Two environment-specific realm files are maintained:

| File | Used by | `sslRequired` | `redirectUris` |
|------|---------|---------------|----------------|
| `realm-statistiloto.dev.json` | `docker-compose.yml` (dev) | `none` | `http://*/*` and `https://*/*` (any HTTP/HTTPS host, incl. Devin previews) |
| `realm-statistiloto.prod.json` | `docker-compose.prod.yml` (prod) | `external` | `https://statistiloto.example.com/*` only |

Both are mounted to `/opt/keycloak/data/import/realm-statistiloto.json` inside
the container — Keycloak only cares about the mount target name.

**Before deploying to production**, edit `realm-statistiloto.prod.json` and
replace `https://statistiloto.example.com` with your real production domain
(in `redirectUris`, `webOrigins`, and `post.logout.redirect.uris`).

## Realm: `statistiloto`

- **Clients**
  - `statistiloto-ui` — public OIDC client used by the Angular PWA
    (authorization-code + PKCE, no client secret).
  - `statistiloto-server` — confidential service-account client for the Java
    BFF (machine-to-machine token exchange if needed). Its secret is injected
    from the `STATISTILOTO_SERVER_CLIENT_SECRET` env var.
- **Realm roles**: `USER`, `ADMIN`, `PAID`.
- **Seeded users** (change passwords immediately in any non-local env):
  - `admin@statistiloto.local` / `admin-password-change-me` — `USER` + `ADMIN`
  - `user@statistiloto.local` / `user-password-change-me` — `USER`
  - `paid@statistiloto.local` / `paid-password-change-me` — `USER` + `PAID`

## Re-exporting the realm

After making changes in the Keycloak admin UI:

```bash
docker compose exec auth /opt/keycloak/bin/kc.sh export \
  --realm statistiloto --file /tmp/realm-statistiloto.json
docker compose cp auth:/tmp/realm-statistiloto.json ./auth/realm-statistiloto.dev.json
```

Strip any user-specific runtime fields before committing. If the change
applies to prod too, sync it to `realm-statistiloto.prod.json` (keeping the
prod-locked `redirectUris` / `sslRequired`).
