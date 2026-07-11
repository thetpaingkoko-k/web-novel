package com.webnovel.controller;

import com.webnovel.dto.moderation.ReportRequest;
import com.webnovel.dto.moderation.ReportResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.ReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** File a report against content or a user (PROJECT SPEC.md §10.8, FR-12.1). */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Moderation")
public class ReportController {

    private final ReportService reports;

    @PostMapping
    public ResponseEntity<ReportResponse> file(@Valid @RequestBody ReportRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reports.file(SecurityUtils.requirePrincipal(), req));
    }
}
