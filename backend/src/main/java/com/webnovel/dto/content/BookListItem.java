package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.Genre;
import java.util.List;

/**
 * Book browse/list row. {@code authorUsername} and {@code chapterCount} are
 * denormalized read-model fields; {@code readChaptersCount} is populated only
 * for an authenticated reader, else null (§4.1.1). {@code genres} is a per-row
 * collection that a JPQL constructor projection cannot build, so browse queries
 * use the collection-less constructor and the service fills genres in via
 * {@link #withGenres} after a batch load.
 */
public record BookListItem(
        Long bookId,
        String title,
        String coverImageUrl,
        List<Genre> genres,
        BookStatus status,
        boolean isPremium,
        String authorUsername,
        CareerStage careerStage,
        long chapterCount,
        Integer readChaptersCount) {

    /** Used by JPQL browse queries; genres and readChaptersCount are filled in later. */
    public BookListItem(Long bookId, String title, String coverImageUrl,
                        BookStatus status, boolean isPremium, String authorUsername,
                        CareerStage careerStage, long chapterCount) {
        this(bookId, title, coverImageUrl, List.of(), status, isPremium,
                authorUsername, careerStage, chapterCount, null);
    }

    /** Returns a copy with the given genres (immutable-record population pattern). */
    public BookListItem withGenres(List<Genre> genres) {
        return new BookListItem(bookId, title, coverImageUrl, genres, status, isPremium,
                authorUsername, careerStage, chapterCount, readChaptersCount);
    }
}
