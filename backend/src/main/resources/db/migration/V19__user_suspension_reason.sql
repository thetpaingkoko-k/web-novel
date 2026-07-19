-- ============================================================
-- V19: Suspension/ban reason (FR-1.4)
--  - suspension_reason: the admin-supplied reason captured when a user is
--    suspended or banned; surfaced to the user on a blocked login attempt and
--    cleared on reactivation. Nullable so existing rows remain valid.
-- ============================================================
ALTER TABLE users
    ADD COLUMN suspension_reason VARCHAR(500);
