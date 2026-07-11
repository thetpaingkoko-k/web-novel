package com.webnovel.dto.content;

import com.webnovel.domain.enums.ChapterStatus;
import java.time.OffsetDateTime;

/**
 * Full chapter incl. content — returned to the author, or to a reader who passes access control.
 * {@code likedByMe} is populated on the reader path ({@code GET /chapters/{id}}); authoring and
 * admin review responses always return {@code false}.
 */
public record ChapterResponse(
        Long chapterId,
        Long bookId,
        Integer chapterNumber,
        String title,
        String content,
        ChapterStatus status,
        int likeCount,
        int uniqueViewCount,
        int completionCount,
        String rejectionReason,
        OffsetDateTime publishedAt,
        boolean likedByMe) {
}
