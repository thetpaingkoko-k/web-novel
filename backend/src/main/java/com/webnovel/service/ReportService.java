package com.webnovel.service;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Report;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.CommentStatus;
import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.domain.enums.ReportTargetType;
import com.webnovel.dto.moderation.AdminReportRow;
import com.webnovel.dto.moderation.ReportRequest;
import com.webnovel.dto.moderation.ReportResponse;
import com.webnovel.dto.moderation.ResolveReportRequest;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterCommentRepository;
import com.webnovel.repository.DebatePostRepository;
import com.webnovel.repository.ReportRepository;
import com.webnovel.repository.UserRepository;
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
    private final BookRepository books;
    private final UserRepository users;
    private final AdminActionService adminActions;

    @Transactional
    public ReportResponse file(AppUserPrincipal reporter, ReportRequest req) {
        // FR-12.1: you cannot report content you authored (or report yourself).
        Long ownerId = resolveOwner(req.targetType(), req.targetId());
        if (ownerId != null && ownerId.equals(reporter.getId())) {
            throw new BadRequestException("report.cannot_report_self");
        }
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
        return reports.findQueueByStatus(status).stream().map(this::enrich).toList();
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
                .map(this::enrich)
                .orElseThrow();
    }

    /**
     * Resolves the reported content's own text/title and its author so the queue row is
     * actionable (FR-13.6). Deleted targets simply resolve to nulls.
     */
    private AdminReportRow enrich(AdminReportRow row) {
        String content = null;
        Long authorId = null;
        switch (row.targetType()) {
            case chapter_comment -> {
                var c = comments.findById(row.targetId());
                content = c.map(x -> excerpt(x.getContent())).orElse(null);
                authorId = c.map(x -> x.getReaderId()).orElse(null);
            }
            case debate_post -> {
                var p = posts.findById(row.targetId());
                content = p.map(x -> excerpt(x.getContent())).orElse(null);
                authorId = p.map(x -> x.getAuthorId()).orElse(null);
            }
            case book -> {
                var b = books.findById(row.targetId());
                content = b.map(Book::getTitle).orElse(null);
                authorId = b.map(Book::getAuthorId).orElse(null);
            }
            case user -> authorId = row.targetId(); // the reported account is its own "author"
        }
        String username = authorId == null ? null
                : users.findById(authorId).map(User::getUsername).orElse(null);
        if (row.targetType() == ReportTargetType.user && content == null) {
            content = username; // the reported user's own username is the content shown
        }
        return row.withTargetDetail(content, authorId, username);
    }

    private static String excerpt(String text) {
        if (text == null) {
            return null;
        }
        String oneLine = text.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= 200 ? oneLine : oneLine.substring(0, 197) + "…";
    }

    /** Owner (creator) of the reported target, or {@code null} if it can't be resolved. */
    private Long resolveOwner(ReportTargetType type, Long targetId) {
        return switch (type) {
            case chapter_comment -> comments.findById(targetId)
                    .map(c -> c.getReaderId()).orElse(null);
            case debate_post -> posts.findById(targetId)
                    .map(p -> p.getAuthorId()).orElse(null);
            case book -> books.findById(targetId)
                    .map(b -> b.getAuthorId()).orElse(null);
            case user -> targetId; // reporting a user account == the user themselves
        };
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
