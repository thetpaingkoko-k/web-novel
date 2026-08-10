-- ============================================================
-- OAuth (Google Sign-In) support
-- Flyway migration V10
-- ============================================================
-- Adds an auth_provider discriminator so Google-created accounts
-- are distinguishable from password (LOCAL) accounts, and relaxes
-- password_hash to NULL since Google users never set a password.
--
-- Policy (rule B / "reject on collision", decided with product):
--   * A Google sign-in whose email already belongs to a LOCAL account
--     is rejected at the service layer — no linking, no duplicate row.
--   * email stays globally UNIQUE, so a Google account and a LOCAL
--     account can never share an address.
-- ============================================================

ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL'
        CHECK (auth_provider IN ('LOCAL', 'GOOGLE'));

-- A LOCAL account must always carry a password hash; a GOOGLE account never does.
ALTER TABLE users
    ADD CONSTRAINT chk_users_local_has_password
        CHECK (auth_provider <> 'LOCAL' OR password_hash IS NOT NULL);
