-- Per-category icon (§5). Categories an admin adds had no icon of their own and fell back
-- to a generic book glyph, which read as "unfinished" next to the seeded ones. The column
-- stores an icon *name* from the frontend's curated registry (not markup or a URL), so an
-- unknown or NULL value simply falls back to the generic icon.
ALTER TABLE categories ADD COLUMN icon VARCHAR(40);

-- Backfill the seeded categories with the icons the frontend already hardcoded for them,
-- so the pickers and tiles look identical before and after this migration.
UPDATE categories SET icon = CASE code
    WHEN 'Fantasy'     THEN 'Sparkles'
    WHEN 'Romance'     THEN 'Heart'
    WHEN 'SciFi'       THEN 'Rocket'
    WHEN 'Mystery'     THEN 'Search'
    WHEN 'Drama'       THEN 'Drama'
    WHEN 'Action'      THEN 'Zap'
    WHEN 'Adventure'   THEN 'Compass'
    WHEN 'Horror'      THEN 'Ghost'
    WHEN 'Thriller'    THEN 'Flame'
    WHEN 'Historical'  THEN 'Landmark'
    WHEN 'SliceOfLife' THEN 'Coffee'
    WHEN 'Comedy'      THEN 'Laugh'
    WHEN 'MartialArts' THEN 'Swords'
    WHEN 'Xianxia'     THEN 'Mountain'
    WHEN 'Isekai'      THEN 'DoorOpen'
    ELSE icon
END
WHERE icon IS NULL;
