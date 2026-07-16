package com.webnovel.dto.content;

import com.webnovel.domain.enums.ChapterStatus;
import java.time.OffsetDateTime;

/**
 * Chapter list row (no content). Carries denormalized analytics (§4.1.1). {@code preview}
 * is {@code true} for a premium book's free-preview chapters (first 10% of published
 * chapters), so the frontend can badge them and skip the paywall.
 */
public record ChapterSummary(
        Long chapterId,
        Integer chapterNumber,
        String title,
        ChapterStatus status,
        int likeCount,
        int uniqueViewCount,
        int completionCount,
        OffsetDateTime publishedAt,
        boolean preview) {
}
