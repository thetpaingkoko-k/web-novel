package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;

/**
 * Book browse/list row. {@code authorUsername} and {@code chapterCount} are
 * denormalized read-model fields; {@code readChaptersCount} is populated only
 * for an authenticated reader, else null (§4.1.1).
 */
public record BookListItem(
        Long bookId,
        String title,
        String coverImageUrl,
        String genre,
        BookStatus status,
        boolean isPremium,
        String authorUsername,
        long chapterCount,
        Integer readChaptersCount) {

    /** Used by JPQL browse queries; readChaptersCount is filled in later for authenticated readers. */
    public BookListItem(Long bookId, String title, String coverImageUrl, String genre,
                        BookStatus status, boolean isPremium, String authorUsername, long chapterCount) {
        this(bookId, title, coverImageUrl, genre, status, isPremium, authorUsername, chapterCount, null);
    }
}
