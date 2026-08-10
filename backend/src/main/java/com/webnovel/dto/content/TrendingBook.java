package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.CareerStage;
import java.util.List;

/**
 * A book on the home "trending" carousel (§5): the browse fields plus the raw engagement
 * counters the popularity score is built from, so the slide can both rank and display them.
 *
 * <p>Like {@link BookListItem}, the per-row {@code genres} collection can't be built by a JPQL
 * constructor projection, so the query uses the collection-less constructor and the service
 * fills genres in via {@link #withGenres} after a batch load.
 */
public record TrendingBook(
        Long bookId,
        String title,
        String coverImageUrl,
        BookStatus status,
        boolean isPremium,
        String authorUsername,
        String authorAvatarUrl,
        CareerStage careerStage,
        long chapterCount,
        long viewCount,
        long likeCount,
        long commentCount,
        List<String> genres) {

    /** Projection constructor: genres are batch-loaded afterwards (starts empty). */
    public TrendingBook(Long bookId, String title, String coverImageUrl, BookStatus status,
                        boolean isPremium, String authorUsername, String authorAvatarUrl,
                        CareerStage careerStage, long chapterCount, long viewCount,
                        long likeCount, long commentCount) {
        this(bookId, title, coverImageUrl, status, isPremium, authorUsername, authorAvatarUrl,
                careerStage, chapterCount, viewCount, likeCount, commentCount, List.of());
    }

    /** Returns a copy carrying the given genres (immutable-record population pattern). */
    public TrendingBook withGenres(List<String> genres) {
        return new TrendingBook(bookId, title, coverImageUrl, status, isPremium, authorUsername,
                authorAvatarUrl, careerStage, chapterCount, viewCount, likeCount, commentCount, genres);
    }
}
