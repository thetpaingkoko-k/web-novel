package com.webnovel.controller;

import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.dto.engagement.CommentResponse;
import com.webnovel.dto.moderation.AdminActionRow;
import com.webnovel.dto.moderation.AdminReportRow;
import com.webnovel.dto.moderation.ResolveReportRequest;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.AdminActionService;
import com.webnovel.service.EngagementService;
import com.webnovel.service.ReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin report resolution and audit log (PROJECT SPEC.md §10.8, FR-13.6/13.7). */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Moderation")
public class AdminModerationController {

    private final ReportService reports;
    private final AdminActionService adminActions;
    private final EngagementService engagement;

    @GetMapping("/reports")
    public List<AdminReportRow> queue(
            @RequestParam(defaultValue = "pending") ReportStatus status) {
        return reports.queue(status);
    }

    @PutMapping("/reports/{id}/resolve")
    public AdminReportRow resolve(@PathVariable Long id, @Valid @RequestBody ResolveReportRequest req) {
        return reports.resolve(SecurityUtils.currentUserId(), id, req);
    }

    /**
     * Hide the report's target (comment/debate post → {@code hidden}, book → {@code hidden=true})
     * and mark the report {@code action_taken}; audited. Returns the updated queue row. User
     * targets are not hideable → 400.
     */
    @PutMapping("/reports/{id}/hide-target")
    public AdminReportRow hideReportTarget(@PathVariable Long id) {
        return reports.hideReportTarget(SecurityUtils.currentUserId(), id);
    }

    /**
     * Reverse a hide: restore the target's visibility and return the report to the {@code pending}
     * queue; audited. Returns the updated queue row. User targets are not hideable → 400.
     */
    @PutMapping("/reports/{id}/unhide-target")
    public AdminReportRow unhideReportTarget(@PathVariable Long id) {
        return reports.unhideReportTarget(SecurityUtils.currentUserId(), id);
    }

    @GetMapping("/actions")
    public List<AdminActionRow> auditLog(@RequestParam(defaultValue = "100") int limit) {
        return adminActions.recent(limit);
    }

    /** Delete a single audit-log entry. 204 on success, 404 if it does not exist. */
    @DeleteMapping("/actions/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void deleteAuditEntry(@PathVariable Long id) {
        adminActions.delete(id);
    }

    /** Hide a comment (sets status {@code hidden}); audited. Returns the updated comment. */
    @PutMapping("/comments/{commentId}/hide")
    public CommentResponse hideComment(@PathVariable Long commentId) {
        return engagement.setCommentHidden(SecurityUtils.currentUserId(), commentId, true);
    }

    /** Restore a hidden comment (sets status {@code visible}); audited. Returns the updated comment. */
    @PutMapping("/comments/{commentId}/unhide")
    public CommentResponse unhideComment(@PathVariable Long commentId) {
        return engagement.setCommentHidden(SecurityUtils.currentUserId(), commentId, false);
    }
}
