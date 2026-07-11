-- ============================================================
-- V3: Bookmarks / "My List" (PROJECT SPEC.md §4.1.1)
-- Beyond-spec, purely additive: readers save books they like.
-- Not in the ERD; unique per (reader, book).
-- ============================================================
CREATE TABLE bookmarks (
    bookmark_id  BIGSERIAL PRIMARY KEY,
    reader_id    BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    book_id      BIGINT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reader_id, book_id)
);

CREATE INDEX idx_bookmarks_reader ON bookmarks(reader_id);
