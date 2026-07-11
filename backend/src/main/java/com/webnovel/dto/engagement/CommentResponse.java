package com.webnovel.dto.engagement;

import com.webnovel.domain.enums.CommentStatus;
import java.time.OffsetDateTime;

/** Comment read model with the joined author username (§4.1.1). */
public record CommentResponse(
        Long commentId,
        Long chapterId,
        Long parentCommentId,
        Long readerId,
        String readerUsername,
        String content,
        boolean spoilerFlagged,
        CommentStatus status,
        OffsetDateTime createdAt) {
}
