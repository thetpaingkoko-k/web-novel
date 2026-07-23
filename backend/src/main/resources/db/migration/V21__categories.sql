-- Admin-managed book categories, replacing the hardcoded `Genre` enum (§5).
--
-- `code` is the immutable wire value: it is what `book_genres.genre` stores, what
-- book create/update payloads send, and what the `GET /books?genre=` browse filter
-- and the frontend's `/books?genre=` deep links carry. Renaming a category therefore
-- only touches `name` (the admin-editable display label) and never rewrites book rows
-- or breaks a bookmarked link.
--
-- `active` retires a category from the pickers without destroying the books already
-- filed under it; `sort_order` fixes the order of the browse/home tiles.
CREATE TABLE categories (
    category_id BIGSERIAL PRIMARY KEY,
    code        VARCHAR(30)  NOT NULL UNIQUE,
    name        VARCHAR(60)  NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_active ON categories(active, sort_order);

-- Seed the 15 canonical genres so existing book_genres rows stay resolvable. The codes
-- match the retired enum names exactly (see V7__book_genres.sql).
INSERT INTO categories (code, name, sort_order) VALUES
    ('Fantasy',     'Fantasy',        1),
    ('Romance',     'Romance',        2),
    ('SciFi',       'Sci-Fi',         3),
    ('Mystery',     'Mystery',        4),
    ('Drama',       'Drama',          5),
    ('Action',      'Action',         6),
    ('Adventure',   'Adventure',      7),
    ('Horror',      'Horror',         8),
    ('Thriller',    'Thriller',       9),
    ('Historical',  'Historical',    10),
    ('SliceOfLife', 'Slice of Life', 11),
    ('Comedy',      'Comedy',        12),
    ('MartialArts', 'Martial Arts',  13),
    ('Xianxia',     'Xianxia',       14),
    ('Isekai',      'Isekai',        15);

-- Any book_genres row that predates a category (there should be none — V7 only wrote
-- canonical names) would now be unresolvable, so backfill categories for stragglers.
INSERT INTO categories (code, name, sort_order)
SELECT DISTINCT bg.genre, bg.genre, 100
FROM book_genres bg
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.code = bg.genre);
