-- Book-level view counter + raw view rows, mirroring chapter views (§9.2, FR-5.x).
-- The denormalized counter lives on books.view_count; book_views stores the raw
-- rows that drive the 24h-window unique-view dedup.
ALTER TABLE books ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0;

CREATE TABLE book_views (
    view_id             BIGSERIAL PRIMARY KEY,
    book_id             BIGINT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    reader_id           BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    session_id          VARCHAR(100) NOT NULL,
    device_fingerprint  VARCHAR(255),
    is_unique           BOOLEAN NOT NULL DEFAULT false,
    viewed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supports the 24h-window dedup lookup (book + session/reader, most recent first)
CREATE INDEX idx_book_views_dedup ON book_views(book_id, session_id, viewed_at);
CREATE INDEX idx_book_views_reader ON book_views(reader_id, viewed_at);
