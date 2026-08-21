# Statistiloto-New

A modernized, stateless, scalable, secured reimplementation of the
[Statistiloto](https://github.com/lihai1) lottery-analysis project.

## Architecture

Six containerized services orchestrated by Docker Compose:

- **proxy** — Traefik (TLS, routing, rate limiting, ForwardAuth)
- **ui** — Angular 20 PWA (standalone, signals, Keycloak PKCE)
- **server** — Java 21 / Spring Boot 3.5 BFF (OAuth2 Resource Server, gRPC client)
- **lottery** — Go 1.25 lottery algorithm + scraper (gRPC + REST gateway)
- **auth** — Keycloak 25 (OIDC, JWT issuance)
- **db** — PostgreSQL 16 (schemas: `keycloak`, `app`, `lottery`)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Quick Start

```bash
cp .env.example .env
cd proxy && ./generate-cert.sh && cd ..
docker compose up -d --build
docker compose ps
```

Then open https://localhost/

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Runbook](docs/runbook.md)

## Development

The shared protobuf contract is at `proto/lottery.proto`. When changing it,
regenerate stubs for both Go and Java (see the runbook).

## Verification

```bash
# Go tests
docker compose exec lottery go test ./...

# Java tests
docker compose exec server ./gradlew test

# Angular tests
docker compose exec ui npm test
```

## License

Private project.
