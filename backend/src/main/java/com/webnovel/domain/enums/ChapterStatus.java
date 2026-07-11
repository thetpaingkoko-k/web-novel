package com.webnovel.domain.enums;

/** Chapter lifecycle (FR-2.5/3.x). Lowercase constants match the schema/wire values. */
public enum ChapterStatus {
    draft,
    pending_review,
    scheduled,
    published,
    rejected
}
