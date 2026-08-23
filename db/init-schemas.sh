#!/usr/bin/env bash
# Statistiloto PostgreSQL initialization.
# Creates the three logical schemas used by the services.
# Run automatically by the postgres image entrypoint on a fresh data volume.
set -euo pipefail

# POSTGRES_USER is exported by the postgres docker entrypoint.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<_SQL
CREATE SCHEMA IF NOT EXISTS keycloak AUTHORIZATION $POSTGRES_USER;
CREATE SCHEMA IF NOT EXISTS app      AUTHORIZATION $POSTGRES_USER;
CREATE SCHEMA IF NOT EXISTS lottery  AUTHORIZATION $POSTGRES_USER;
CREATE SCHEMA IF NOT EXISTS agent    AUTHORIZATION $POSTGRES_USER;

COMMENT ON SCHEMA keycloak IS 'Managed by Keycloak (users, sessions, realm data)';
COMMENT ON SCHEMA app      IS 'Owned by the Java BFF (user_profile, saved_numbers)';
COMMENT ON SCHEMA lottery  IS 'Owned by the Go lottery-stats-server (lottery_results)';
COMMENT ON SCHEMA agent    IS 'Owned by the Python agent service (token_usage, audit_log, llm_config, embeddings)';
_SQL

echo "[statistiloto-db] schemas created: keycloak, app, lottery, agent"
