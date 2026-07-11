package com.webnovel.domain.enums;

/** Payment submission status (FR-6.x). Lowercase constants match the schema/wire values. */
public enum PaymentStatus {
    pending,
    approved,
    rejected,
    flagged_duplicate
}
