package com.webnovel.domain.enums;

/**
 * Canonical book genres (§5). Enum names are the serialized wire values and the
 * strings persisted in the {@code book_genres} join table — do not rename.
 */
public enum Genre {
    Fantasy,
    Romance,
    SciFi,
    Mystery,
    Drama,
    Action,
    Adventure,
    Horror,
    Thriller,
    Historical,
    SliceOfLife,
    Comedy,
    MartialArts,
    Xianxia,
    Isekai
}
