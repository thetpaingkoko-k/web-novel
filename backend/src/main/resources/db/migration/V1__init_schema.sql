-- ============================================================
-- Web Novel Platform - Initial Schema
-- Flyway migration V1
-- Target: PostgreSQL 14+
-- Generated from webnovel_platform_erd_v2.mmd
-- ============================================================
-- Notes:
--  - Enums are modeled as VARCHAR + CHECK constraints (not native
--    PostgreSQL ENUM types) so values can be extended later with a
--    simple constraint migration instead of ALTER TYPE gymnastics.
--  - All *_id primary keys use BIGSERIAL/BIGINT for headroom.
--  - Denormalized cache columns (counts, balances) default to 0
--    and are expected to be maintained by the application layer.
-- ============================================================

-- ============================================================
-- 1. USER
-- ============================================================
CREATE TABLE users (
    user_id         BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL
                        CHECK (role IN ('reader','hobbyist_author','professional_author','admin')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','suspended','banned')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================
-- 2. AUTHOR_PROFILE
-- ============================================================
CREATE TABLE author_profiles (
    author_profile_id          BIGSERIAL PRIMARY KEY,
    user_id                    BIGINT NOT NULL UNIQUE
                                    REFERENCES users(user_id) ON DELETE CASCADE,
    bio                        TEXT,
    career_stage               VARCHAR(20) NOT NULL
                                    CHECK (career_stage IN ('hobbyist','professional')),
    is_monetization_enabled    BOOLEAN NOT NULL DEFAULT false,
    monthly_subscription_price NUMERIC(12,2),
    payout_wallet_provider     VARCHAR(20)
                                    CHECK (payout_wallet_provider IN ('KBZPay','WavePay','AYAPay','other')),
    payout_wallet_number       VARCHAR(50),
    available_balance          NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_earned               NUMERIC(14,2) NOT NULL DEFAULT 0,
    approved_at                TIMESTAMPTZ
);

-- ============================================================
-- 3. ADMIN_WALLET
-- ============================================================
CREATE TABLE admin_wallets (
    wallet_id       BIGSERIAL PRIMARY KEY,
    provider        VARCHAR(20) NOT NULL
                        CHECK (provider IN ('KBZPay','WavePay','AYAPay','other')),
    wallet_number   VARCHAR(50) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. BOOK
-- ============================================================
CREATE TABLE books (
    book_id         BIGSERIAL PRIMARY KEY,
    author_id       BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    synopsis        TEXT,
    genre           VARCHAR(50),
    cover_image_url VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','ongoing','completed','hiatus')),
    is_premium      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_books_status ON books(status);

-- ============================================================
-- 5. CHAPTER
-- ============================================================
CREATE TABLE chapters (
    chapter_id          BIGSERIAL PRIMARY KEY,
    book_id             BIGINT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    chapter_number      INT NOT NULL,
    title               VARCHAR(255) NOT NULL,
    content             TEXT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','pending_review','scheduled','published','rejected')),
    reviewed_by         BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    like_count          INT NOT NULL DEFAULT 0,
    unique_view_count   INT NOT NULL DEFAULT 0,
    completion_count    INT NOT NULL DEFAULT 0,
    published_at        TIMESTAMPTZ,
    UNIQUE (book_id, chapter_number)
);

CREATE INDEX idx_chapters_book   ON chapters(book_id);
CREATE INDEX idx_chapters_status ON chapters(status);

-- ============================================================
-- 6. SUBSCRIPTION
-- ============================================================
CREATE TABLE subscriptions (
    subscription_id BIGSERIAL PRIMARY KEY,
    reader_id       BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    author_id       BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN ('pending_payment','active','expired','rejected')),
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    price_mmk       NUMERIC(12,2) NOT NULL,
    reminder_sent   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_subscriptions_reader ON subscriptions(reader_id);
CREATE INDEX idx_subscriptions_author ON subscriptions(author_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================
-- 7. PAYMENT_SUBMISSION
-- ============================================================
CREATE TABLE payment_submissions (
    submission_id   BIGSERIAL PRIMARY KEY,
    reader_id       BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    wallet_id       BIGINT NOT NULL REFERENCES admin_wallets(wallet_id),
    subscription_id BIGINT REFERENCES subscriptions(subscription_id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL,
    screenshot_url  VARCHAR(500) NOT NULL,
    last_6_digits   VARCHAR(6) NOT NULL,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','flagged_duplicate')),
    reviewed_by     BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT
);

CREATE INDEX idx_payment_submissions_reader ON payment_submissions(reader_id);
CREATE INDEX idx_payment_submissions_status ON payment_submissions(status);
-- Supports the fraud-check dedup query (same last 6 digits / amount / wallet in a time window)
CREATE INDEX idx_payment_submissions_dedup ON payment_submissions(wallet_id, last_6_digits, amount, submitted_at);

-- ============================================================
-- 8. AUTHOR_EARNING
-- ============================================================
CREATE TABLE author_earnings (
    earning_id              BIGSERIAL PRIMARY KEY,
    author_id               BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    payment_submission_id   BIGINT NOT NULL UNIQUE
                                REFERENCES payment_submissions(submission_id),
    subscription_id         BIGINT NOT NULL REFERENCES subscriptions(subscription_id),
    gross_amount            NUMERIC(12,2) NOT NULL,
    platform_fee_percent    NUMERIC(5,2) NOT NULL,
    platform_fee_amount     NUMERIC(12,2) NOT NULL,
    net_amount              NUMERIC(12,2) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_author_earnings_author ON author_earnings(author_id);

-- ============================================================
-- 9. AUTHOR_WITHDRAWAL
-- ============================================================
CREATE TABLE author_withdrawals (
    withdrawal_id           BIGSERIAL PRIMARY KEY,
    author_id               BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount                  NUMERIC(12,2) NOT NULL,
    payout_wallet_provider  VARCHAR(20) NOT NULL
                                CHECK (payout_wallet_provider IN ('KBZPay','WavePay','AYAPay','other')),
    payout_wallet_number    VARCHAR(50) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','paid','rejected')),
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by              BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    paid_at                  TIMESTAMPTZ,
    rejection_reason         TEXT
);

CREATE INDEX idx_author_withdrawals_author ON author_withdrawals(author_id);
CREATE INDEX idx_author_withdrawals_status ON author_withdrawals(status);

-- ============================================================
-- 10. CHAPTER_VIEW
-- ============================================================
CREATE TABLE chapter_views (
    view_id             BIGSERIAL PRIMARY KEY,
    chapter_id          BIGINT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    reader_id           BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    session_id          VARCHAR(100) NOT NULL,
    device_fingerprint  VARCHAR(255),
    is_unique           BOOLEAN NOT NULL DEFAULT false,
    viewed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supports the 24h-window dedup lookup (chapter + session/reader, most recent first)
CREATE INDEX idx_chapter_views_dedup ON chapter_views(chapter_id, session_id, viewed_at);
CREATE INDEX idx_chapter_views_reader ON chapter_views(reader_id, viewed_at);

-- ============================================================
-- 11. CHAPTER_LIKE
-- ============================================================
CREATE TABLE chapter_likes (
    like_id     BIGSERIAL PRIMARY KEY,
    chapter_id  BIGINT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    reader_id   BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (chapter_id, reader_id)
);

-- ============================================================
-- 12. CHAPTER_COMMENT
-- ============================================================
CREATE TABLE chapter_comments (
    comment_id          BIGSERIAL PRIMARY KEY,
    chapter_id          BIGINT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    reader_id           BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    parent_comment_id   BIGINT REFERENCES chapter_comments(comment_id) ON DELETE CASCADE,
    content             TEXT NOT NULL,
    is_spoiler_flagged  BOOLEAN NOT NULL DEFAULT false,
    status              VARCHAR(20) NOT NULL DEFAULT 'visible'
                            CHECK (status IN ('visible','hidden','removed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapter_comments_chapter ON chapter_comments(chapter_id);
CREATE INDEX idx_chapter_comments_parent  ON chapter_comments(parent_comment_id);

-- ============================================================
-- 13. READING_PROGRESS
-- ============================================================
CREATE TABLE reading_progress (
    progress_id             BIGSERIAL PRIMARY KEY,
    reader_id               BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    book_id                 BIGINT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    last_chapter_read_id    BIGINT REFERENCES chapters(chapter_id) ON DELETE SET NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reader_id, book_id)
);

-- ============================================================
-- 14. DEBATE_THREAD
-- ============================================================
CREATE TABLE debate_threads (
    thread_id   BIGSERIAL PRIMARY KEY,
    book_id     BIGINT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    creator_id  BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','locked','archived')),
    post_count  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (book_id, creator_id)  -- one discussion per reader per book
);

-- Supports the "10 threads / 5 days per book" rate-limit check
CREATE INDEX idx_debate_threads_book_created ON debate_threads(book_id, created_at);

-- ============================================================
-- 15. DEBATE_POST
-- ============================================================
CREATE TABLE debate_posts (
    post_id         BIGSERIAL PRIMARY KEY,
    thread_id       BIGINT NOT NULL REFERENCES debate_threads(thread_id) ON DELETE CASCADE,
    author_id       BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    parent_post_id  BIGINT REFERENCES debate_posts(post_id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    upvote_count    INT NOT NULL DEFAULT 0,
    downvote_count  INT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'visible'
                        CHECK (status IN ('visible','hidden','removed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debate_posts_thread ON debate_posts(thread_id);
CREATE INDEX idx_debate_posts_parent ON debate_posts(parent_post_id);

-- ============================================================
-- 16. DEBATE_VOTE
-- ============================================================
CREATE TABLE debate_votes (
    vote_id     BIGSERIAL PRIMARY KEY,
    post_id     BIGINT NOT NULL REFERENCES debate_posts(post_id) ON DELETE CASCADE,
    reader_id   BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vote_type   VARCHAR(4) NOT NULL CHECK (vote_type IN ('up','down')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, reader_id)
);

-- ============================================================
-- 17. REPORT
-- ============================================================
CREATE TABLE reports (
    report_id       BIGSERIAL PRIMARY KEY,
    reporter_id     BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    target_type     VARCHAR(30) NOT NULL
                        CHECK (target_type IN ('chapter_comment','debate_post','book','user')),
    target_id       BIGINT NOT NULL,
    reason          VARCHAR(500) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','reviewed','action_taken','dismissed')),
    reviewed_by     BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

-- ============================================================
-- 18. AUTHOR_FEED_POST
-- ============================================================
CREATE TABLE author_feed_posts (
    feed_post_id    BIGSERIAL PRIMARY KEY,
    author_id       BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    is_premium_only BOOLEAN NOT NULL DEFAULT false,
    published_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_author_feed_posts_author ON author_feed_posts(author_id);

-- ============================================================
-- 19. ADMIN_ACTION
-- ============================================================
CREATE TABLE admin_actions (
    admin_action_id BIGSERIAL PRIMARY KEY,
    admin_id        BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_type     VARCHAR(30) NOT NULL
                        CHECK (action_type IN (
                            'user_approval','content_approval','content_rejection',
                            'content_removal','ban','report_resolution','withdrawal_approval'
                        )),
    target_type     VARCHAR(30) NOT NULL,
    target_id       BIGINT NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_admin  ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);

-- ============================================================
-- End of V1__init_schema.sql
-- ============================================================
