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
 *
 * <p>{@code hidden} is the admin moderation flag ({@code books.hidden}); it is only
 * ever {@code true} in listings an admin is allowed to see (admin browse), so the
 * frontend can badge the row and offer unhide. All non-admin projections leave it
 * {@code false}.
 */
public record BookListItem(
        Long bookId,
        String title,
        String coverImageUrl,
        List<Genre> genres,
        BookStatus status,
        boolean isPremium,
        String authorUsername,
        String authorAvatarUrl,
        CareerStage careerStage,
        long chapterCount,
        Integer readChaptersCount,
        boolean hidden) {

    /** Used by JPQL projections that don't surface the moderation flag; genres and
     * readChaptersCount are filled in later, {@code hidden} defaults to false. */
    public BookListItem(Long bookId, String title, String coverImageUrl,
                        BookStatus status, boolean isPremium, String authorUsername,
                        String authorAvatarUrl, CareerStage careerStage, long chapterCount) {
        this(bookId, title, coverImageUrl, List.of(), status, isPremium,
                authorUsername, authorAvatarUrl, careerStage, chapterCount, null, false);
    }

    /** Used by the admin-aware browse projection, which carries the {@code hidden} flag. */
    public BookListItem(Long bookId, String title, String coverImageUrl,
                        BookStatus status, boolean isPremium, String authorUsername,
                        String authorAvatarUrl, CareerStage careerStage, long chapterCount,
                        boolean hidden) {
        this(bookId, title, coverImageUrl, List.of(), status, isPremium,
                authorUsername, authorAvatarUrl, careerStage, chapterCount, null, hidden);
    }

    /** Returns a copy with the given genres (immutable-record population pattern). */
    public BookListItem withGenres(List<Genre> genres) {
        return new BookListItem(bookId, title, coverImageUrl, genres, status, isPremium,
                authorUsername, authorAvatarUrl, careerStage, chapterCount, readChaptersCount, hidden);
    }
}
