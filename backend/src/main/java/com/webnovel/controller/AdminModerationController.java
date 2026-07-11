package com.webnovel.controller;

import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.dto.moderation.AdminActionRow;
import com.webnovel.dto.moderation.AdminReportRow;
import com.webnovel.dto.moderation.ResolveReportRequest;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.AdminActionService;
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

    @GetMapping("/reports")
    public List<AdminReportRow> queue(
            @RequestParam(defaultValue = "pending") ReportStatus status) {
        return reports.queue(status);
    }

    @PutMapping("/reports/{id}/resolve")
    public AdminReportRow resolve(@PathVariable Long id, @Valid @RequestBody ResolveReportRequest req) {
        return reports.resolve(SecurityUtils.currentUserId(), id, req);
    }

    @GetMapping("/actions")
    public List<AdminActionRow> auditLog(@RequestParam(defaultValue = "100") int limit) {
        return adminActions.recent(limit);
    }
}
