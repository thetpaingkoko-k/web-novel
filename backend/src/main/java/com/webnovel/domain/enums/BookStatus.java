package com.webnovel.domain.enums;

/** Book lifecycle (FR-2.2). Lowercase constants match the schema/wire values. */
public enum BookStatus {
    draft,
    ongoing,
    completed,
    hiatus
}
