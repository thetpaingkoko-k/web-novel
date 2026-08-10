package com.webnovel.dto.content;

import com.webnovel.domain.enums.ChapterStatus;
import java.time.OffsetDateTime;

/**
 * Chapter list row (no content). Carries denormalized analytics (§4.1.1). {@code preview}
 * is {@code true} for a premium book's free-preview chapters (first 10% of published
 * chapters), so the frontend can badge them and skip the paywall. {@code hasAudio} is
 * {@code true} when the chapter has narration audio (audiobook), so the list can badge it
 * without shipping the full audio URL in the browse payload.
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
        boolean preview,
        boolean hasAudio) {
}
