package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;
import java.time.OffsetDateTime;
import java.util.List;

/** Book detail, including the nested chapter list (§4.1.1). */
public record BookDetailResponse(
        Long bookId,
        Long authorId,
        String authorUsername,
        String title,
        String synopsis,
        String genre,
        String coverImageUrl,
        BookStatus status,
        boolean isPremium,
        OffsetDateTime createdAt,
        List<ChapterSummary> chapters) {
}
