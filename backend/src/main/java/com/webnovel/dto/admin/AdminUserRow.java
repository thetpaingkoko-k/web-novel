package com.webnovel.dto.admin;

import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import java.math.BigDecimal;

/**
 * Admin user-management row (§10.2, FR-1.4/13.1). {@code careerStage},
 * {@code monetizationEnabled}, and {@code monthlySubscriptionPrice} are null/false for
 * users without an author profile.
 */
public record AdminUserRow(
        Long userId,
        String username,
        String email,
        Role role,
        UserStatus status,
        CareerStage careerStage,
        boolean monetizationEnabled,
        BigDecimal monthlySubscriptionPrice) {
}
