package com.webnovel.controller;

import com.webnovel.dto.content.AdminChapterRow;
import com.webnovel.dto.content.ChapterResponse;
import com.webnovel.dto.content.RejectRequest;
import com.webnovel.service.ChapterPublishService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin hobbyist-chapter review queue (PROJECT SPEC.md §10.3, FR-3.3). */
@RestController
@RequestMapping("/api/v1/admin/chapters")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Chapters")
public class AdminChapterController {

    private final ChapterPublishService chapterPublishService;

    @GetMapping
    public List<AdminChapterRow> reviewQueue(@RequestParam(defaultValue = "pending_review") String status) {
        return chapterPublishService.reviewQueue();
    }

    @PutMapping("/{id}/approve")
    public ChapterResponse approve(@PathVariable Long id) {
        return chapterPublishService.approve(id);
    }

    @PutMapping("/{id}/reject")
    public ChapterResponse reject(@PathVariable Long id, @Valid @RequestBody RejectRequest req) {
        return chapterPublishService.reject(id, req.reason());
    }
}
