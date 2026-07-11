package com.webnovel.service;

import com.webnovel.domain.entity.Report;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.CommentStatus;
import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.dto.moderation.AdminReportRow;
import com.webnovel.dto.moderation.ReportRequest;
import com.webnovel.dto.moderation.ReportResponse;
import com.webnovel.dto.moderation.ResolveReportRequest;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.ChapterCommentRepository;
import com.webnovel.repository.DebatePostRepository;
import com.webnovel.repository.ReportRepository;
import com.webnovel.security.AppUserPrincipal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reporting & moderation (FR-12). Action-taken resolutions cascade to hiding the target (FR-12.3). */
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reports;
    private final ChapterCommentRepository comments;
    private final DebatePostRepository posts;
    private final AdminActionService adminActions;

    @Transactional
    public ReportResponse file(AppUserPrincipal reporter, ReportRequest req) {
        Report report = new Report();
        report.setReporterId(reporter.getId());
        report.setTargetType(req.targetType());
        report.setTargetId(req.targetId());
        report.setReason(req.reason());
        report.setStatus(ReportStatus.pending);
        reports.save(report);
        return new ReportResponse(report.getId(), report.getTargetType(),
                report.getTargetId(), report.getStatus());
    }

    @Transactional(readOnly = true)
    public List<AdminReportRow> queue(ReportStatus status) {
        return reports.findQueueByStatus(status);
    }

    @Transactional
    public AdminReportRow resolve(Long adminId, Long reportId, ResolveReportRequest req) {
        if (req.status() != ReportStatus.action_taken && req.status() != ReportStatus.dismissed) {
            throw new BadRequestException("report.invalid_target");
        }
        Report report = reports.findById(reportId)
                .orElseThrow(() -> new NotFoundException("error.not_found"));
        report.setStatus(req.status());
        report.setReviewedBy(adminId);
        report.setResolvedAt(OffsetDateTime.now());

        if (req.status() == ReportStatus.action_taken) {
            hideTarget(report);
            adminActions.log(adminId, AdminActionType.content_removal,
                    report.getTargetType().name(), report.getTargetId(), req.notes());
        }
        adminActions.log(adminId, AdminActionType.report_resolution,
                "report", reportId, req.notes());

        return reports.findQueueByStatus(report.getStatus()).stream()
                .filter(r -> r.reportId().equals(reportId))
                .findFirst()
                .orElseThrow();
    }

    /** FR-12.3: hide the reported content where the target type supports it. */
    private void hideTarget(Report report) {
        switch (report.getTargetType()) {
            case chapter_comment -> comments.findById(report.getTargetId())
                    .ifPresent(c -> c.setStatus(CommentStatus.hidden));
            case debate_post -> posts.findById(report.getTargetId())
                    .ifPresent(p -> p.setStatus(CommentStatus.hidden));
            default -> { /* book/user removal handled via user suspension / content tools, not here */ }
        }
    }
}
