package com.webnovel.dto.moderation;

import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.domain.enums.ReportTargetType;
import java.time.OffsetDateTime;

/**
 * Report queue row (§4.1.1, FR-13.6). Carries the joined reporter username plus the
 * reported content's own text/title and its author, resolved after the base query so the
 * admin can act on the report without a second lookup.
 */
public record AdminReportRow(
        Long reportId,
        Long reporterId,
        String reporterUsername,
        ReportTargetType targetType,
        Long targetId,
        String targetContent,
        Long targetAuthorId,
        String targetAuthorUsername,
        String reason,
        ReportStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt) {

    /** Projection constructor used by the repository JPQL; content/author resolved afterwards. */
    public AdminReportRow(Long reportId, Long reporterId, String reporterUsername,
                          ReportTargetType targetType, Long targetId, String reason,
                          ReportStatus status, OffsetDateTime createdAt, OffsetDateTime resolvedAt) {
        this(reportId, reporterId, reporterUsername, targetType, targetId,
                null, null, null, reason, status, createdAt, resolvedAt);
    }

    public AdminReportRow withTargetDetail(String targetContent, Long targetAuthorId,
                                           String targetAuthorUsername) {
        return new AdminReportRow(reportId, reporterId, reporterUsername, targetType, targetId,
                targetContent, targetAuthorId, targetAuthorUsername, reason, status,
                createdAt, resolvedAt);
    }
}
