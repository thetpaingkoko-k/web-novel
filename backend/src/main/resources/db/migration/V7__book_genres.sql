-- Predefined multi-genre model (§5): a book carries a set of canonical genres.
CREATE TABLE book_genres (
    book_id BIGINT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    genre   VARCHAR(30) NOT NULL
);

CREATE INDEX idx_book_genres_book  ON book_genres(book_id);
CREATE INDEX idx_book_genres_genre ON book_genres(genre);

-- Migrate existing free-text genres into the join table, normalizing case and mapping
-- to canonical enum names. Unmatched values are dropped.
INSERT INTO book_genres (book_id, genre)
SELECT b.book_id,
       CASE lower(regexp_replace(b.genre, '[^a-zA-Z]', '', 'g'))
           WHEN 'fantasy'     THEN 'Fantasy'
           WHEN 'romance'     THEN 'Romance'
           WHEN 'scifi'       THEN 'SciFi'
           WHEN 'sciencefiction' THEN 'SciFi'
           WHEN 'mystery'     THEN 'Mystery'
           WHEN 'drama'       THEN 'Drama'
           WHEN 'action'      THEN 'Action'
           WHEN 'adventure'   THEN 'Adventure'
           WHEN 'horror'      THEN 'Horror'
           WHEN 'thriller'    THEN 'Thriller'
           WHEN 'historical'  THEN 'Historical'
           WHEN 'sliceoflife' THEN 'SliceOfLife'
           WHEN 'comedy'      THEN 'Comedy'
           WHEN 'martialarts' THEN 'MartialArts'
           WHEN 'xianxia'     THEN 'Xianxia'
           WHEN 'isekai'      THEN 'Isekai'
           ELSE NULL
       END
FROM books b
WHERE b.genre IS NOT NULL
  AND CASE lower(regexp_replace(b.genre, '[^a-zA-Z]', '', 'g'))
          WHEN 'fantasy'     THEN 'Fantasy'
          WHEN 'romance'     THEN 'Romance'
          WHEN 'scifi'       THEN 'SciFi'
          WHEN 'sciencefiction' THEN 'SciFi'
          WHEN 'mystery'     THEN 'Mystery'
          WHEN 'drama'       THEN 'Drama'
          WHEN 'action'      THEN 'Action'
          WHEN 'adventure'   THEN 'Adventure'
          WHEN 'horror'      THEN 'Horror'
          WHEN 'thriller'    THEN 'Thriller'
          WHEN 'historical'  THEN 'Historical'
          WHEN 'sliceoflife' THEN 'SliceOfLife'
          WHEN 'comedy'      THEN 'Comedy'
          WHEN 'martialarts' THEN 'MartialArts'
          WHEN 'xianxia'     THEN 'Xianxia'
          WHEN 'isekai'      THEN 'Isekai'
          ELSE NULL
      END IS NOT NULL;

ALTER TABLE books DROP COLUMN genre;
