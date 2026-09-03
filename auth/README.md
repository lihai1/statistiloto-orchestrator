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
- **Groups**: `/users`, `/admins`, `/paid`, `/unverified`.
  - `defaultGroups: ["/users", "/unverified"]` — all new registrations
    (password and social) start in both `/users` and `/unverified`.
    Remove from `/unverified` after email verification or admin approval.
- **Seeded users** (change passwords immediately in any non-local env):
  - `admin@statistiloto.local` / `admin-password-change-me` — `USER` + `ADMIN`
  - `user@statistiloto.local` / `user-password-change-me` — `USER`
  - `paid@statistiloto.local` / `paid-password-change-me` — `USER` + `PAID`

## Custom login theme (`themes/statistiloto/`)

The realm sets `loginTheme: "statistiloto"`, which loads the custom theme
mounted at `/opt/keycloak/themes/statistiloto/login/`. It extends Keycloak's
built-in `keycloak.v2` theme (PatternFly v5) and layers the Statistiloto
design system on top via CSS overrides.

### Structure

```
themes/statistiloto/login/
├── theme.properties          # parent=keycloak.v2, styles=css/statistiloto.css
└── resources/
    ├── css/statistiloto.css  # design tokens, RTL, fonts, button/input/card styles
    └── img/logo.svg          # brand logo (injected via CSS ::before on header)
```

### What it styles

- **Fonts**: Heebo (body) + Quicksand (headings) — same as the Angular UI
  (`ui-fable/src/index.html`).
- **Colors**: indigo primary `#6366f1`, surface `#ffffff`, background `#faf7ff`.
  Dark mode via `@media (prefers-color-scheme: dark)` mirrors the Angular
  `.app-dark` tokens.
- **Layout**: rounded cards (16px radius), gradient primary buttons, outline
  secondary buttons, 10px-radius inputs with indigo focus ring.
- **RTL**: `direction: rtl` on body (Hebrew-first).
- **Social buttons**: full-width outline buttons with brand-colored icons.
- **Coverage**: login, registration, forgot-password, and all auth pages
  inherit the CSS via `theme.properties` — no per-page template overrides.

### Modifying the theme

Edit `themes/statistiloto/login/resources/css/statistiloto.css` and restart
the `auth` container (`make restart-auth`). No rebuild needed — the themes
directory is mounted as a volume, not baked into the image.

## Social login (Google + Facebook)

The realm configures two built-in Keycloak identity providers:

| Provider | `providerId` | Env vars |
|----------|-------------|----------|
| Google   | `google`    | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Facebook | `facebook`  | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` |

Both are configured in the `identityProviders` array of the realm JSON.
Credentials are injected via environment variables (see `.env.example`).
If the env vars are empty, the providers are enabled in the realm but
non-functional — the buttons appear on the login page but clicking them
produces an error. Set the credentials in `.env` to activate them.

### Setup

1. **Google**: https://console.cloud.google.com/apis/credentials
   - Create an OAuth 2.0 Client ID (Web application).
   - Authorized redirect URI:
     `http://localhost/auth/realms/statistiloto/broker/google/endpoint`
     (prod: `https://YOUR_DOMAIN/auth/realms/statistiloto/broker/google/endpoint`)
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

2. **Facebook**: https://developers.facebook.com/apps/
   - Create an app, add the Facebook Login product.
   - Valid OAuth Redirect URI:
     `http://localhost/auth/realms/statistiloto/broker/facebook/endpoint`
     (prod: `https://YOUR_DOMAIN/auth/realms/statistiloto/broker/facebook/endpoint`)
   - Set `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` in `.env`.

3. Restart the auth container: `make restart-auth`.

### Account linking policy

Both providers use `trustEmail: false` and the built-in `first broker login`
flow. When a user signs in with Google/Facebook using an email that matches
an existing password account, Keycloak prompts them to log in with the
existing password to confirm ownership before linking the social identity.
This prevents account takeover via unverified social emails — important
because the realm has a `PAID` tier with real value.

If no matching email exists, a new account is created with the `USER` role
and the `/users` + `/unverified` groups (via `defaultGroups`).

### Adding more providers

To add Apple Sign In or other providers in the future:
1. Add an entry to the `identityProviders` array in both realm JSON files.
2. Add the corresponding env vars to `docker-compose.yml` and `.env.example`.
3. For Apple: deploy the `klausbetz/apple-identity-provider-keycloak` extension
   JAR to `/opt/keycloak/providers` (requires a volume mount and Makefile
   download step). See the extension's compatibility table for the correct
   version for your Keycloak version.

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

**Note**: Keycloak's `--import-realm` only imports the realm if it does not
already exist in the database. To apply realm JSON changes to an existing
deployment, either:
- `make clean-volumes` (destructive — wipes the entire DB including Keycloak,
  app, lottery, and agent schemas), then `make up`, or
- Apply changes via the Keycloak admin UI or `kcadm.sh`, then re-export as
  above.
