package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.Genre;
import java.time.OffsetDateTime;
import java.util.List;

/** Book detail, including the nested chapter list (§4.1.1). */
public record BookDetailResponse(
        Long bookId,
        Long authorId,
        String authorUsername,
        CareerStage careerStage,
        String title,
        String synopsis,
        List<Genre> genres,
        String coverImageUrl,
        BookStatus status,
        boolean isPremium,
        boolean hidden,
        OffsetDateTime createdAt,
        List<ChapterSummary> chapters) {
}
