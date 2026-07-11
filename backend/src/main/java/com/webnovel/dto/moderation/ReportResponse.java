package com.webnovel.dto.moderation;

import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.domain.enums.ReportTargetType;

/** Acknowledgement returned when a report is filed (FR-12.1). */
public record ReportResponse(
        Long reportId,
        ReportTargetType targetType,
        Long targetId,
        ReportStatus status) {
}
