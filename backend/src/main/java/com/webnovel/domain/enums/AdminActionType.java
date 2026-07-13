package com.webnovel.domain.enums;

/** Audited admin action types (ERD ADMIN_ACTION). Lowercase constants match the schema/wire values. */
public enum AdminActionType {
    user_approval,
    content_approval,
    content_rejection,
    content_removal,
    ban,
    report_resolution,
    withdrawal_approval,
    subscription_price_update
}
