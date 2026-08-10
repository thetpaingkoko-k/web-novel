package com.webnovel.domain.enums;

/**
 * In-app notification event types. Lowercase constants match the wire/DB values, like
 * {@link AdminActionType}. Grouped by the role that typically receives them, but any
 * event may target any user; the enum is the single place a new event type is added.
 */
public enum NotificationType {
    // Reader-facing
    subscription_activated,
    subscription_expiring,
    subscription_expired,
    payment_rejected,
    report_resolved,
    content_removed,

    // Author-facing
    new_subscriber,
    chapter_approved,
    chapter_rejected,
    book_approved,
    book_rejected,
    book_deleted,
    withdrawal_approved,
    withdrawal_rejected,
    author_verified,
    author_rejected,
    upgrade_approved,
    upgrade_rejected,

    // Admin-facing ("something needs review")
    chapter_submitted,
    report_filed,
    upgrade_requested,
    payment_submitted,
    withdrawal_requested
}
