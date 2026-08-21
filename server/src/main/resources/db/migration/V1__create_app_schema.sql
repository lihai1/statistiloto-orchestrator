-- Statistiloto app schema — owned by the Java BFF.
-- Keycloak owns identity (users, credentials). This schema stores only
-- application data keyed by the Keycloak subject (sub) claim.

CREATE TABLE IF NOT EXISTS app.user_profile (
    sub          TEXT PRIMARY KEY,
    display_name VARCHAR(255),
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app.saved_numbers (
    id         BIGSERIAL PRIMARY KEY,
    user_sub   TEXT NOT NULL REFERENCES app.user_profile(sub) ON DELETE CASCADE,
    category   VARCHAR(50) NOT NULL,
    numbers    JSONB NOT NULL,
    will_be    JSONB,
    date_from  DATE,
    date_to    DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_numbers_user_sub ON app.saved_numbers(user_sub);
CREATE INDEX IF NOT EXISTS idx_saved_numbers_category ON app.saved_numbers(category);
