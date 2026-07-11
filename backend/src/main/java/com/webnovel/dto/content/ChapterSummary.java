package com.webnovel.dto.content;

import com.webnovel.domain.enums.ChapterStatus;
import java.time.OffsetDateTime;

/** Chapter list row (no content). Carries denormalized analytics (§4.1.1). */
public record ChapterSummary(
        Long chapterId,
        Integer chapterNumber,
        String title,
        ChapterStatus status,
        int likeCount,
        int uniqueViewCount,
        int completionCount,
        OffsetDateTime publishedAt) {
}
