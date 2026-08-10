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
        String targetLabel,
        String notes,
        OffsetDateTime createdAt) {

    /** Projection constructor used by the repository JPQL; the label is resolved afterwards. */
    public AdminActionRow(Long adminActionId, Long adminId, String adminUsername,
                          AdminActionType actionType, String targetType, Long targetId,
                          String notes, OffsetDateTime createdAt) {
        this(adminActionId, adminId, adminUsername, actionType, targetType, targetId,
                null, notes, createdAt);
    }

    public AdminActionRow withTargetLabel(String label) {
        return new AdminActionRow(adminActionId, adminId, adminUsername, actionType,
                targetType, targetId, label, notes, createdAt);
    }
}
