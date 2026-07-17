-- ============================================================
-- V14: Expanded become-an-author application (§4.1.1)
--  - writing_motivation: "Why do you want to write?"
--  - writing_interests:  "What do you want to write?"
-- Nullable so existing author profiles remain valid.
-- ============================================================
ALTER TABLE author_profiles
    ADD COLUMN writing_motivation TEXT,
    ADD COLUMN writing_interests  TEXT;
