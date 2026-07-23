package com.webnovel.dto.content;


/** (bookId, genre) pair used to batch-load per-book genres for list rows (§5). */
public record BookGenreRow(Long bookId, String genre) {
}
