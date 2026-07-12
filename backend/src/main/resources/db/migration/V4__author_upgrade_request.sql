-- ============================================================
-- V4: Hobbyist -> Professional upgrade request (PROJECT SPEC.md §4.1.1)
-- A hobbyist author flags interest in monetization; admins review the
-- queue and approve via the existing enable_monetization path.
-- ============================================================
ALTER TABLE author_profiles
    ADD COLUMN professional_requested    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN professional_requested_at TIMESTAMPTZ;
