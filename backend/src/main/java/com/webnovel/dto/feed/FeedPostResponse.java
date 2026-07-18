package com.webnovel.dto.feed;

import java.time.OffsetDateTime;

/** Author feed post read model (FR-11.2). */
public record FeedPostResponse(
        Long feedPostId,
        Long authorId,
        String authorUsername,
        String authorAvatarUrl,
        String title,
        String content,
        boolean premiumOnly,
        OffsetDateTime publishedAt) {
}
