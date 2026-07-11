package com.webnovel.dto.debate;

import com.webnovel.domain.enums.CommentStatus;
import com.webnovel.domain.enums.VoteType;
import java.time.OffsetDateTime;

/** Debate post read model: joined author username + this reader's own vote (§4.1.1). */
public record PostResponse(
        Long postId,
        Long threadId,
        Long authorId,
        String authorUsername,
        Long parentPostId,
        String content,
        int upvoteCount,
        int downvoteCount,
        CommentStatus status,
        OffsetDateTime createdAt,
        VoteType myVote) {
}
