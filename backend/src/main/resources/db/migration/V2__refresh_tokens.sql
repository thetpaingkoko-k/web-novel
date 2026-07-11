-- ============================================================
-- V2: Refresh tokens (server-side revocable + rotating, FR-1.3)
-- Not in the ERD; required by the JWT auth design in the
-- backend-starter skill. Only a SHA-256 hash of the token is
-- stored, never the raw token.
-- ============================================================
CREATE TABLE refresh_tokens (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
