package com.webnovel.dto.debate;

import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.ThreadStatus;
import java.time.OffsetDateTime;

/** Debate thread read model with the joined creator username (§4.1.1). */
public record ThreadResponse(
        Long threadId,
        Long bookId,
        Long creatorId,
        String creatorUsername,
        String creatorAvatarUrl,
        CareerStage careerStage,
        String title,
        ThreadStatus status,
        int postCount,
        OffsetDateTime createdAt) {
}
