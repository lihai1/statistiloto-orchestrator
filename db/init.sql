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
CREATE TABLE IF NOT EXISTS lottery.lottery_results (
    id           SERIAL PRIMARY KEY,
    draw_date    DATE NOT NULL UNIQUE,
    numbers      INTEGER[] NOT NULL,
    will_be      INTEGER[] NOT NULL DEFAULT '{}',
    form_type    INTEGER NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staging table for the raw lotto.data CSV import.
-- Format: draw_id, draw_date(DD/MM/YY), n1, n2, n3, n4, n5, n6, will_be, extra1, extra2
CREATE TEMP TABLE lotto_staging (
    draw_id    TEXT,
    draw_date  TEXT,
    n1 INTEGER, n2 INTEGER, n3 INTEGER, n4 INTEGER, n5 INTEGER, n6 INTEGER,
    will_be    INTEGER,
    extra1     INTEGER,
    extra2     INTEGER
);

-- Import the raw CSV data (skip garbled Hebrew header row).
\copy lotto_staging FROM '/seed/lotto.data' WITH (FORMAT csv, DELIMITER ',', HEADER true, NULL '')

-- Transform into lottery_results. Date format is DD/MM/YY.
INSERT INTO lottery.lottery_results (draw_date, numbers, will_be, form_type)
SELECT
    TO_DATE(draw_date, 'DD/MM/YY') AS draw_date,
    ARRAY[n1, n2, n3, n4, n5, n6] AS numbers,
    CASE WHEN will_be > 0 THEN ARRAY[will_be] ELSE ARRAY[]::INTEGER[] END AS will_be,
    1 AS form_type
FROM lotto_staging
WHERE draw_date IS NOT NULL
ON CONFLICT (draw_date) DO NOTHING;

-- App schema tables — owned by the Java BFF (Flyway manages migrations).
-- Flyway will create user_profiles and saved_numbers tables.
