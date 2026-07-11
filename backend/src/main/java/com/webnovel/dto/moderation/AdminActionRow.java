package com.webnovel.dto.moderation;

import com.webnovel.domain.enums.AdminActionType;
import java.time.OffsetDateTime;

/** One row of the append-only admin audit log (FR-13.7). */
public record AdminActionRow(
        Long adminActionId,
        Long adminId,
        AdminActionType actionType,
        String targetType,
        Long targetId,
        String notes,
        OffsetDateTime createdAt) {
}
