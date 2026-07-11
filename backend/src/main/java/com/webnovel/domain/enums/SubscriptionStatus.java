package com.webnovel.domain.enums;

/** Per-author subscription lifecycle (FR-6.x). Lowercase constants match the schema/wire values. */
public enum SubscriptionStatus {
    pending_payment,
    active,
    expired,
    rejected
}
