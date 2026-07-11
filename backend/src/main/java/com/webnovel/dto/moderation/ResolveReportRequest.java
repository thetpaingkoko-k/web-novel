package com.webnovel.dto.moderation;

import com.webnovel.domain.enums.ReportStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Resolve a report (FR-12.2): {@code action_taken} or {@code dismissed}. When
 * action is taken, the target content is hidden (FR-12.3).
 */
public record ResolveReportRequest(
        @NotNull(message = "{validation.field.required}") ReportStatus status,
        String notes) {
}
