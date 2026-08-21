# Keycloak customization for Statistiloto.

This directory holds the `statistiloto` realm export imported on first boot via
`KC_IMPORT` (see `../docker-compose.yml`).

## Realm: `statistiloto`

- **Clients**
  - `statistiloto-ui` — public OIDC client used by the Angular PWA
    (authorization-code + PKCE, no client secret).
  - `statistiloto-server` — confidential service-account client for the Java
    BFF (machine-to-machine token exchange if needed). Its secret is injected
    from the `STATISTILOTO_SERVER_CLIENT_SECRET` env var.
- **Realm roles**: `USER`, `ADMIN`.
- **Seeded users** (change passwords immediately in any non-local env):
  - `admin@statistiloto.local` / `admin-password-change-me` — `USER` + `ADMIN`
  - `user@statistiloto.local` / `user-password-change-me` — `USER`

## Re-exporting the realm

After making changes in the Keycloak admin UI:

```bash
docker compose exec auth /opt/keycloak/bin/kc.sh export \
  --realm statistiloto --file /tmp/realm-statistiloto.json
docker compose cp auth:/tmp/realm-statistiloto.json ./auth/realm-statistiloto.json
```

Strip any user-specific runtime fields before committing.
