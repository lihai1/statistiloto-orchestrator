# Statistiloto-New — orchestration Makefile.
#
# Drives the full 8-service Docker Compose stack for dev and prod.
# Dev  = docker-compose.yml                       (HTTP, start-dev Keycloak, seed-on-boot)
# Prod = docker-compose.yml + docker-compose.prod.yml (HTTPS, prod Keycloak, resource limits)
#
# Usage:
#   make help            — list all targets
#   make setup           — one-shot: submodules + .env + certs
#   make up              — build + start dev stack
#   make up-prod         — build + start prod stack
#   make test            — run all unit/integration tests
#   make test-e2e        — run Playwright E2E (requires stack running)

# Use bash for recipe shells (Makefile uses [[ ... ]] bash-isms)
SHELL := /bin/bash

# ─── Configuration ──────────────────────────────────────────────
ENV_FILE         := .env
ENV_EXAMPLE      := .env.example

COMPOSE          := docker compose
COMPOSE_DEV      := $(COMPOSE)
COMPOSE_PROD     := $(COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_NGROK    := $(COMPOSE) -f docker-compose.yml -f docker-compose.ngrok.yml

# Active compose command — overridden by ENV=prod
ENV              ?= dev
ifeq ($(ENV),prod)
  DC             := $(COMPOSE_PROD)
else
  DC             := $(COMPOSE_DEV)
endif

# Services (for logs / restart / shell targets)
SERVICES         := db auth lottery agent ollama server ui proxy
APP_SERVICES     := lottery server agent ui

# ─── Phony targets ──────────────────────────────────────────────
.PHONY: help \
        setup init-submodules env certs \
        build build-dev build-prod pull \
        up up-dev up-prod up-ngrok down down-dev down-prod restart restart-% \
        ps logs logs-% logs-follow \
        health wait \
        test test-go test-java test-ui test-agent test-e2e \
        proto proto-go proto-java proto-python \
        lint lint-go lint-java lint-ui \
        shell-% \
        scale scale-% \
        db-shell db-backup db-restore \
        clean clean-containers clean-volumes clean-images clean-all

# ─── Default ────────────────────────────────────────────────────
.DEFAULT_GOAL := help

# ─── Setup ──────────────────────────────────────────────────────

# One-shot bootstrap: submodules + .env + TLS certs
setup: init-submodules env certs
	@echo "[setup] Done. Edit $(ENV_FILE) then run: make up"

# Initialize / update git submodules (ui, server, proto, agent, lottery-stats-server)
init-submodules:
	@echo "[setup] Initializing submodules..."
	git submodule update --init --recursive

# Create .env from .env.example if it doesn't exist
env:
	@if [[ ! -f $(ENV_FILE) ]]; then \
	  cp $(ENV_EXAMPLE) $(ENV_FILE); \
	  echo "[setup] Created $(ENV_FILE) from $(ENV_EXAMPLE) — edit it before going to prod."; \
	else \
	  echo "[setup] $(ENV_FILE) already exists, skipping."; \
	fi

# Generate self-signed TLS certs for local HTTPS (dev) or prod override
certs:
	@echo "[setup] Generating TLS certs..."
	@cd proxy && ./generate-cert.sh

# ─── Build ──────────────────────────────────────────────────────

# Build all images (active env)
build:
	@echo "[build] Building images (ENV=$(ENV))..."
	$(DC) build

build-dev:
	@$(MAKE) build ENV=dev

build-prod:
	@$(MAKE) build ENV=prod

# Pull pre-built images (ollama, postgres, keycloak, traefik)
pull:
	@echo "[build] Pulling images..."
	$(DC) pull --ignore-buildable

# ─── Up / Down ──────────────────────────────────────────────────

# Build + start the stack in detached mode (active env)
up:
	@echo "[up] Starting stack (ENV=$(ENV))..."
	$(DC) up -d --build
	@$(MAKE) wait

up-dev:
	@$(MAKE) up ENV=dev

# ngrok: ensure tunnel is running, sync KEYCLOAK_ISSUER, start stack.
# The ngrok tunnel runs on the host (not in Docker). If it's not running,
# we start it. If the tunnel URL changed, we update docker-compose.ngrok.yml
# so issuer validation matches the actual tunnel hostname.
up-ngrok:
	@echo "[up-ngrok] Checking ngrok tunnel..."
	@if ! curl -sf http://localhost:4040/api/tunnels >/dev/null 2>&1; then \
		echo "[up-ngrok] ngrok not running. Starting: ngrok http 80"; \
		nohup ngrok http 80 --log=stdout --log-format=logfmt >/tmp/ngrok.log 2>&1 & \
		sleep 4; \
		if ! curl -sf http://localhost:4040/api/tunnels >/dev/null 2>&1; then \
			echo "[up-ngrok] ERROR: ngrok failed to start. Check /tmp/ngrok.log"; \
			exit 1; \
		fi; \
		echo "[up-ngrok] ngrok started (log: /tmp/ngrok.log)"; \
	else \
		echo "[up-ngrok] ngrok already running"; \
	fi
	@TUNNEL_URL=$$(curl -sf http://localhost:4040/api/tunnels \
		| python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])" 2>/dev/null); \
	if [ -z "$$TUNNEL_URL" ]; then \
		echo "[up-ngrok] ERROR: could not determine tunnel URL from ngrok API"; \
		exit 1; \
	fi; \
	echo "[up-ngrok] Tunnel URL: $$TUNNEL_URL"; \
	EXPECTED_ISSUER="$$TUNNEL_URL/auth/realms/statistiloto"; \
	CURRENT_ISSUER=$$(grep 'KEYCLOAK_ISSUER:' docker-compose.ngrok.yml | head -1 | sed 's/.*: *"\(.*\)".*/\1/'); \
	if [ "$$EXPECTED_ISSUER" != "$$CURRENT_ISSUER" ]; then \
		echo "[up-ngrok] Updating KEYCLOAK_ISSUER in docker-compose.ngrok.yml:"; \
		echo "[up-ngrok]   $$CURRENT_ISSUER → $$EXPECTED_ISSUER"; \
		sed -i "s|KEYCLOAK_ISSUER: .*|KEYCLOAK_ISSUER: \"$$EXPECTED_ISSUER\"|" docker-compose.ngrok.yml; \
	else \
		echo "[up-ngrok] KEYCLOAK_ISSUER already matches tunnel URL"; \
	fi
	@echo "[up-ngrok] Starting stack with ngrok override..."
	$(COMPOSE_NGROK) up -d --build
	@$(MAKE) wait

# Prod needs TLS certs for HTTPS — generate if missing before starting
up-prod: certs
	@$(MAKE) up ENV=prod

# Start without rebuilding
start:
	@echo "[up] Starting existing containers (ENV=$(ENV))..."
	$(DC) up -d
	@$(MAKE) wait

# Stop and remove containers (keeps volumes)
down:
	@echo "[down] Stopping stack (ENV=$(ENV))..."
	$(DC) down

down-dev:
	@$(MAKE) down ENV=dev

down-prod:
	@$(MAKE) down ENV=prod

# Stop without removing (containers stay on disk)
stop:
	@echo "[stop] Stopping containers..."
	$(DC) stop

# Restart the whole stack
restart:
	@echo "[restart] Restarting stack (ENV=$(ENV))..."
	$(DC) restart
	@$(MAKE) wait

# Restart a single service: make restart-server
restart-%:
	@echo "[restart] Restarting $*..."
	$(DC) restart "$*"

# ─── Status / Logs ──────────────────────────────────────────────

# List containers and their health
ps:
	@$(DC) ps

# Tail all logs
logs:
	@$(DC) logs -f --tail=100

# Tail a specific service: make logs-server
logs-%:
	@$(DC) logs -f --tail=200 "$*"

logs-follow: logs

# ─── Health ─────────────────────────────────────────────────────

# Show container health status
health:
	@echo "[health] Container status:"
	@$(DC) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Wait for all services to be healthy (up to ~5 min)
wait:
	@echo "[health] Waiting for services to become healthy..."
	@timeout=300; \
	while [ "$$timeout" -gt 0 ]; do \
	  unhealthy=$$($(DC) ps --format json 2>/dev/null | grep -c '"Health":"starting"' || true); \
	  total=$$($(DC) ps --format json 2>/dev/null | wc -l); \
	  healthy=$$($(DC) ps --format json 2>/dev/null | grep -c '"Health":"healthy"' || true); \
	  echo "  healthy=$$healthy/$$total (starting=$$unhealthy)"; \
	  if [ "$$unhealthy" -eq 0 ] && [ "$$healthy" -ge "$$total" ]; then break; fi; \
	  sleep 10; timeout=$$((timeout - 10)); \
	done; \
	if [ "$$timeout" -le 0 ]; then echo "[health] TIMEOUT — some services not healthy"; $(DC) ps; exit 1; \
	else echo "[health] All services healthy."; fi

# ─── Tests ──────────────────────────────────────────────────────

# Run all unit/integration tests across services
test: test-go test-java test-ui test-agent
	@echo "[test] All service tests complete."

# Go lottery-stats-server tests
test-go:
	@echo "[test] Go lottery-stats-server..."
	$(DC) exec lottery go test ./...

# Java BFF tests
test-java:
	@echo "[test] Java BFF..."
	$(DC) exec server ./gradlew test

# Angular unit tests (Karma)
test-ui:
	@echo "[test] Angular UI..."
	$(DC) exec ui npm test -- --watch=false

# Python agent tests
test-agent:
	@echo "[test] Python agent..."
	$(DC) exec agent make test

# Playwright E2E — requires the stack to be running
test-e2e:
	@echo "[test] Playwright E2E (stack must be running)..."
	cd ui && npx playwright test

# Playwright E2E — only the login sanity test
test-e2e-login:
	@echo "[test] Playwright login sanity..."
	cd ui && npx playwright test --grep "login|Login|התחבר"

# ─── Protobuf ───────────────────────────────────────────────────

# Regenerate Go + Java + Python gRPC stubs from proto/lottery.proto
proto: proto-go proto-java proto-python
	@echo "[proto] Stubs regenerated for all three services."

# Go stubs: use a minimal protoc builder image (Dockerfile.proto) with the
# lottery-stats-server source mounted. Much faster than the full builder stage.
proto-go:
	@echo "[proto] Regenerating Go stubs..."
	docker build -t lottery-proto-builder -f lottery-stats-server/Dockerfile.proto lottery-stats-server/
	docker run --rm \
		-v $(PWD)/lottery-stats-server:/app \
		lottery-proto-builder make proto

# Java stubs: run gradle generateProto in the gradle image with the
# orchestrator root mounted so ../proto/ resolves correctly.
proto-java:
	@echo "[proto] Regenerating Java stubs..."
	docker run --rm \
		-v $(PWD):/workspace \
		-w /workspace/server \
		gradle:8.10.2-jdk21 \
		gradle generateProto --no-daemon --no-watch-fs

# Python stubs: use the agent runtime image (has grpc_tools installed).
# Mount proto/ and agent/app/gen/ so generated files appear on the host.
proto-python:
	@echo "[proto] Regenerating Python stubs..."
	$(COMPOSE) run --rm --no-deps \
		-v $(PWD)/proto:/tmp/proto \
		-v $(PWD)/agent/app/gen:/app/app/gen \
		agent sh -c '\
			cp /tmp/proto/lottery.proto /app/app/gen/lottery.proto && \
			python3 -m grpc_tools.protoc \
				-I/app -I/tmp/proto/third_party \
				--python_out=/app --grpc_python_out=/app --pyi_out=/app \
				/app/app/gen/lottery.proto && \
			rm /app/app/gen/lottery.proto && \
			touch /app/app/gen/__init__.py'

# ─── Lint ───────────────────────────────────────────────────────

lint: lint-go lint-java lint-ui
	@echo "[lint] All linters complete."

lint-go:
	@echo "[lint] Go..."
	$(DC) exec lottery golangci-lint run ./... || $(DC) exec lottery go vet ./...

lint-java:
	@echo "[lint] Java..."
	$(DC) exec server ./gradlew checkstyleMain || true

lint-ui:
	@echo "[lint] Angular..."
	$(DC) exec ui npm run lint || true

# ─── Shell ──────────────────────────────────────────────────────

# Open a shell in a service: make shell-server, make shell-lottery
shell-%:
	@echo "[shell] Opening shell in $*..."
	$(DC) exec "$*" sh || $(DC) exec "$*" bash || $(DC) exec "$*" /bin/sh

# ─── Scaling ────────────────────────────────────────────────────

# Scale stateless services (server + lottery) to N replicas each
scale:
	@echo "[scale] Scaling server=2 lottery=2..."
	$(DC) up -d --scale server=2 --scale lottery=2 --no-deps

# Scale a specific service: make scale-server N=3
scale-%:
	@if [[ -z "$(N)" ]]; then echo "Usage: make scale-$* N=3"; exit 1; fi
	@echo "[scale] Scaling $* to $(N)..."
	$(DC) up -d --scale "$*=$(N)" --no-deps

# ─── Database ───────────────────────────────────────────────────

# Open psql in the db container
db-shell:
	@echo "[db] Opening psql..."
	$(DC) exec db psql -U "$${POSTGRES_USER:-statistiloto}" -d "$${POSTGRES_DB:-statistiloto}"

# Backup the database to backup.sql
db-backup:
	@echo "[db] Backing up to backup.sql..."
	$(DC) exec -T db pg_dump -U "$${POSTGRES_USER:-statistiloto}" "$${POSTGRES_DB:-statistiloto}" > backup.sql
	@echo "[db] Backup written to backup.sql ($$(wc -c < backup.sql) bytes)"

# Restore from a file: make db-restore FILE=backup.sql
db-restore:
	@if [[ -z "$(FILE)" ]]; then echo "Usage: make db-restore FILE=backup.sql"; exit 1; fi
	@echo "[db] Restoring from $(FILE)..."
	$(DC) exec -T db psql -U "$${POSTGRES_USER:-statistiloto}" -d "$${POSTGRES_DB:-statistiloto}" < "$(FILE)"
	@echo "[db] Restore complete."

# ─── Clean ──────────────────────────────────────────────────────

# Stop and remove containers (keeps volumes and images)
clean: down
	@echo "[clean] Containers removed."

# Stop and remove containers + volumes (DESTRUCTIVE — wipes DB data)
clean-volumes:
	@echo "[clean] WARNING: removing all volumes (DB data will be lost)..."
	$(DC) down -v

# Remove built images (forces rebuild on next up)
clean-images:
	@echo "[clean] Removing built images..."
	$(DC) down --rmi local

# Full reset: containers + volumes + images
clean-all:
	@echo "[clean] FULL RESET — containers, volumes, and images..."
	$(DC) down -v --rmi local --remove-orphans

# ─── Help ───────────────────────────────────────────────────────

help:
	@echo "Statistiloto-New — orchestration Makefile"
	@echo ""
	@echo "ENVIRONMENT:"
	@echo "  ENV=dev  (default)  — HTTP, start-dev Keycloak, seed-on-boot"
	@echo "  ENV=prod            — HTTPS, prod Keycloak, resource limits"
	@echo "  Override with: make <target> ENV=prod"
	@echo ""
	@echo "SETUP:"
	@echo "  setup              — submodules + .env + TLS certs (one-shot)"
	@echo "  init-submodules    — git submodule update --init --recursive"
	@echo "  env                — create .env from .env.example"
	@echo "  certs              — generate self-signed TLS certs"
	@echo ""
	@echo "BUILD:"
	@echo "  build              — build all images (active env)"
	@echo "  build-dev          — build for dev"
	@echo "  build-prod         — build for prod"
	@echo "  pull               — pull pre-built images"
	@echo ""
	@echo "RUN:"
	@echo "  up                 — build + start detached (active env)"
	@echo "  up-dev             — build + start dev"
	@echo "  up-prod            — build + start prod"
	@echo "  up-ngrok           — start ngrok tunnel + stack (auto-syncs KEYCLOAK_ISSUER)"
	@echo "  start              — start without rebuild"
	@echo "  down               — stop + remove containers"
	@echo "  stop               — stop containers (keep them)"
	@echo "  restart            — restart all services"
	@echo "  restart-<svc>      — restart one service (e.g. restart-server)"
	@echo ""
	@echo "STATUS / LOGS:"
	@echo "  ps                 — list containers + health"
	@echo "  health             — formatted health table"
	@echo "  wait               — wait for all services healthy"
	@echo "  logs               — tail all logs"
	@echo "  logs-<svc>         — tail one service (e.g. logs-server)"
	@echo ""
	@echo "TESTS:"
	@echo "  test               — all unit/integration tests"
	@echo "  test-go            — Go lottery tests"
	@echo "  test-java          — Java BFF tests"
	@echo "  test-ui            — Angular unit tests"
	@echo "  test-agent         — Python agent tests"
	@echo "  test-e2e           — Playwright E2E (stack must be running)"
	@echo "  test-e2e-login     — Playwright login sanity only"
	@echo ""
	@echo "PROTO:"
	@echo "  proto              — regenerate Go + Java + Python stubs"
	@echo "  proto-go           — regenerate Go stubs (lottery builder image)"
	@echo "  proto-java         — regenerate Java stubs (server builder image)"
	@echo "  proto-python       — regenerate Python stubs (agent runtime image)"
	@echo ""
	@echo "LINT:"
	@echo "  lint               — lint all services"
	@echo "  lint-go / lint-java / lint-ui"
	@echo ""
	@echo "SHELL:"
	@echo "  shell-<svc>        — open shell in a service (e.g. shell-server)"
	@echo ""
	@echo "SCALING:"
	@echo "  scale              — scale server=2 lottery=2"
	@echo "  scale-<svc> N=3    — scale one service to N"
	@echo ""
	@echo "DATABASE:"
	@echo "  db-shell           — open psql"
	@echo "  db-backup          — dump to backup.sql"
	@echo "  db-restore FILE=f  — restore from file"
	@echo ""
	@echo "CLEAN:"
	@echo "  clean              — remove containers (keep volumes)"
	@echo "  clean-volumes      — remove containers + volumes (DESTRUCTIVE)"
	@echo "  clean-images       — remove built images"
	@echo "  clean-all          — full reset (containers + volumes + images)"
