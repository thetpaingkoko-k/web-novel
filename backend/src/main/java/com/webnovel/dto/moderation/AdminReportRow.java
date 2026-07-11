package com.webnovel.dto.moderation;

import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.domain.enums.ReportTargetType;
import java.time.OffsetDateTime;

/** Report queue row with the joined reporter username (§4.1.1, FR-13.6). */
public record AdminReportRow(
        Long reportId,
        Long reporterId,
        String reporterUsername,
        ReportTargetType targetType,
        Long targetId,
        String reason,
        ReportStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt) {
}
