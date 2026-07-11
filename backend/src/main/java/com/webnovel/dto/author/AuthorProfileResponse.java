package com.webnovel.dto.author;

import com.webnovel.domain.enums.CareerStage;
import java.math.BigDecimal;

/** Public author profile — combined so the subscribe page needs one call (§4.1.1). */
public record AuthorProfileResponse(
        Long authorId,
        String username,
        String bio,
        CareerStage careerStage,
        boolean isMonetizationEnabled,
        BigDecimal monthlySubscriptionPrice) {
}
