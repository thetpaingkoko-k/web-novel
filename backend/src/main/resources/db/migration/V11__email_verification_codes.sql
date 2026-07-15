-- ============================================================
-- Email verification codes (manual signup)
-- Flyway migration V11
-- ============================================================
-- Manual (email+password) registration now creates the user as
-- 'pending' and emails a 6-digit code; login is blocked until the
-- code is verified, flipping the user to 'approved'. Google users
-- are 'approved' immediately (Google verified the email), so they
-- never get a row here.
--
-- Only a SHA-256 hash of the code is stored, never the raw digits
-- (mirrors refresh_tokens). One active code per user: a resend
-- deletes the previous row and inserts a fresh one.
-- ============================================================
CREATE TABLE email_verification_codes (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    code_hash    VARCHAR(64) NOT NULL,       -- SHA-256 hex
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_codes_user ON email_verification_codes(user_id);
