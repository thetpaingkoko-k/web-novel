package com.webnovel.domain.enums;

/**
 * User role. Constants are intentionally lowercase so {@code EnumType.STRING}
 * persists exactly the values the schema CHECK constraint allows
 * ({@code reader}, {@code hobbyist_author}, ...) and Jackson serializes exactly
 * the strings the frontend contract expects (PROJECT SPEC.md §8.2 / §4.1.1).
 */
public enum Role {
    reader,
    hobbyist_author,
    professional_author,
    admin
}
