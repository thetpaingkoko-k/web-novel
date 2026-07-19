-- In-app notifications for all roles (readers, authors, admins). Generic, polymorphic
-- rows: `type` names the event, (target_type, target_id) is an optional deep-link, and
-- `data` carries a small pre-rendered payload (book title, subscriber username, amount)
-- so the client renders a message without extra lookups. Mirrors the admin_actions style.
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type            VARCHAR(40) NOT NULL,
    target_type     VARCHAR(30),
    target_id       BIGINT,
    data            VARCHAR(500),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The bell lists a user's most-recent notifications.
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Drives the unread-count badge (partial index: only unread rows).
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
