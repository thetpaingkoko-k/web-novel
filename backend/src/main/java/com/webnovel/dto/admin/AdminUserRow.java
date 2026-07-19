package com.webnovel.dto.admin;

import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import java.math.BigDecimal;

/**
 * Admin user-management row (§10.2, FR-1.4/13.1). {@code careerStage},
 * {@code monetizationEnabled}, {@code monthlySubscriptionPrice}, and the author-application
 * answers ({@code bio}, {@code writingMotivation}, {@code writingInterests}) are null/false for
 * users without an author profile. {@code suspensionReason} carries the admin-supplied reason for a
 * suspended/banned account (null otherwise).
 */
public record AdminUserRow(
        Long userId,
        String username,
        String email,
        Role role,
        UserStatus status,
        CareerStage careerStage,
        boolean monetizationEnabled,
        BigDecimal monthlySubscriptionPrice,
        String bio,
        String writingMotivation,
        String writingInterests,
        String suspensionReason) {
}
