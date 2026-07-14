package com.webnovel.dto.content;

import com.webnovel.domain.enums.Genre;

/** (bookId, genre) pair used to batch-load per-book genres for list rows (§5). */
public record BookGenreRow(Long bookId, Genre genre) {
}
