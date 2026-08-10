package com.webnovel.dto.admin;

import com.webnovel.domain.enums.CareerStage;
import java.time.OffsetDateTime;

/** Admin queue row for a pending hobbyist→professional upgrade request (§4.1.1). */
public record UpgradeRequestRow(
        Long userId,
        String username,
        String email,
        String bio,
        CareerStage careerStage,
        OffsetDateTime requestedAt) {
}
