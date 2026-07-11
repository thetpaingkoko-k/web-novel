package com.webnovel.dto.moderation;

import com.webnovel.domain.enums.AdminActionType;
import java.time.OffsetDateTime;

/** One row of the append-only admin audit log, with the acting admin's username (FR-13.7, §4.1.1). */
public record AdminActionRow(
        Long adminActionId,
        Long adminId,
        String adminUsername,
        AdminActionType actionType,
        String targetType,
        Long targetId,
        String notes,
        OffsetDateTime createdAt) {
}
