package com.webnovel.domain.enums;

/** Account status (PROJECT SPEC.md §8.2). Lowercase constants match the schema/wire values. */
public enum UserStatus {
    pending,
    approved,
    suspended,
    banned
}
