-- Statistiloto database initialization.
-- Schemas are created by 01-init-schemas.sh; this file sets up
-- schema-level grants and the lottery_results seed table.

-- ── Keycloak schema ────────────────────────────────────────────
GRANT ALL ON SCHEMA keycloak TO statistiloto;

-- ── App schema (Java BFF: user profiles, saved numbers) ────────
GRANT ALL ON SCHEMA app TO statistiloto;

-- ── Lottery schema (Go service: lottery results) ───────────────
GRANT ALL ON SCHEMA lottery TO statistiloto;

-- Lottery results table — owned by the Go service.
-- Schema matches the Go repository/models.LotteryResult contract:
--   id, draw_number, draw_date, numbers, strong, lottery_type,
--   created_at, updated_at. The repository's ON CONFLICT (draw_number)
--   upsert depends on the unique constraint below.
CREATE TABLE IF NOT EXISTS lottery.lottery_results (
    id           SERIAL PRIMARY KEY,
    draw_number  INTEGER NOT NULL UNIQUE,
    draw_date    TIMESTAMPTZ NOT NULL,
    numbers      INTEGER[] NOT NULL,
    strong       INTEGER NOT NULL DEFAULT 0,
    lottery_type TEXT NOT NULL DEFAULT 'lotto',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staging table for the raw lotto.data CSV import.
-- Format: draw_id, draw_date(DD/MM/YY), n1, n2, n3, n4, n5, n6, strong, extra1, extra2
CREATE TEMP TABLE lotto_staging (
    draw_id    TEXT,
    draw_date  TEXT,
    n1 INTEGER, n2 INTEGER, n3 INTEGER, n4 INTEGER, n5 INTEGER, n6 INTEGER,
    strong     INTEGER,
    extra1     INTEGER,
    extra2     INTEGER
);

-- Import the raw CSV data (skip garbled Hebrew header row).
\copy lotto_staging FROM '/seed/lotto.data' WITH (FORMAT csv, DELIMITER ',', HEADER true, NULL '')

-- Transform into lottery_results. Date format is DD/MM/YY.
INSERT INTO lottery.lottery_results (draw_number, draw_date, numbers, strong, lottery_type)
SELECT
    CAST(draw_id AS INTEGER) AS draw_number,
    TO_TIMESTAMP(draw_date, 'DD/MM/YY') AS draw_date,
    ARRAY[n1, n2, n3, n4, n5, n6] AS numbers,
    COALESCE(strong, 0) AS strong,
    'lotto' AS lottery_type
FROM lotto_staging
WHERE draw_date IS NOT NULL AND draw_id ~ '^[0-9]+$'
ON CONFLICT (draw_number) DO UPDATE
SET draw_date    = EXCLUDED.draw_date,
    numbers      = EXCLUDED.numbers,
    strong       = EXCLUDED.strong,
    lottery_type = EXCLUDED.lottery_type,
    updated_at   = NOW();

-- App schema tables — owned by the Java BFF (Flyway manages migrations).
-- Flyway will create user_profiles and saved_numbers tables.

-- ── Agent schema (Python service: token usage, audit, llm_config, embeddings) ─
GRANT ALL ON SCHEMA agent TO statistiloto;

CREATE EXTENSION IF NOT EXISTS vector;

-- Token usage metering — every LLM call logs here.
CREATE TABLE IF NOT EXISTS agent.token_usage (
    id                BIGSERIAL PRIMARY KEY,
    thread_id         TEXT NOT NULL,
    user_sub          TEXT NOT NULL,
    tier              TEXT NOT NULL,
    provider          TEXT NOT NULL,
    model             TEXT NOT NULL,
    prompt_tokens     INT  NOT NULL DEFAULT 0,
    completion_tokens INT  NOT NULL DEFAULT 0,
    cost_usd          NUMERIC(10,4) NOT NULL DEFAULT 0,
    ts                DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_ts ON agent.token_usage (user_sub, ts);
CREATE INDEX IF NOT EXISTS idx_token_usage_tier_ts ON agent.token_usage (tier, ts);

-- Audit log — admin actions and HITL decisions.
CREATE TABLE IF NOT EXISTS agent.audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_sub    TEXT NOT NULL,
    tier        TEXT NOT NULL,
    action      TEXT NOT NULL,
    details     JSONB,
    ts          DOUBLE PRECISION NOT NULL
);

-- Runtime LLM config — admin-reconfigurable via PUT /llm-config.
-- Latest row wins; config_store polls this and hot-reloads the LLM.
CREATE TABLE IF NOT EXISTS agent.llm_config (
    id          BIGSERIAL PRIMARY KEY,
    provider    TEXT NOT NULL,              -- ollama | gemini
    model       TEXT NOT NULL,
    base_url    TEXT,
    api_key     TEXT,                       -- encrypt with pgcrypto in prod
    updated_by  TEXT NOT NULL,              -- admin user_sub
    updated_at  DOUBLE PRECISION NOT NULL
);

-- pgvector embeddings — corpus-scoped, per-tenant for user_data.
CREATE TABLE IF NOT EXISTS agent.embeddings (
    id          BIGSERIAL PRIMARY KEY,
    corpus      TEXT NOT NULL,              -- docs | lottery_history | user_data | ops_logs
    content     TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}',
    embedding   vector(768)                 -- nomic-embed-text dim
);
CREATE INDEX IF NOT EXISTS idx_embeddings_corpus ON agent.embeddings (corpus);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON agent.embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
