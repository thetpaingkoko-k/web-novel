package com.webnovel.controller;

import com.webnovel.dto.content.ChapterResponse;
import com.webnovel.dto.content.ChapterUpdateRequest;
import com.webnovel.dto.content.PublishRequest;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.ChapterPublishService;
import com.webnovel.service.ChapterService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Chapter edit, read, and publish (PROJECT SPEC.md §10.3). */
@RestController
@RequestMapping("/api/v1/chapters")
@RequiredArgsConstructor
@Tag(name = "Chapters")
public class ChapterController {

    private final ChapterService chapterService;
    private final ChapterPublishService chapterPublishService;

    @PutMapping("/{id}")
    public ChapterResponse update(@PathVariable Long id, @Valid @RequestBody ChapterUpdateRequest req) {
        return chapterService.update(SecurityUtils.requirePrincipal(), id, req);
    }

    /** Read a chapter (access-controlled, §9.1). Public for free books; premium requires a subscription. */
    @GetMapping("/{id}")
    public ChapterResponse read(@PathVariable Long id) {
        return chapterService.getForReader(id, SecurityUtils.currentPrincipal());
    }

    /** Submit for publish (§9.5): direct/scheduled for professionals, pending_review for hobbyists. */
    @PostMapping("/{id}/publish")
    public ChapterResponse publish(@PathVariable Long id,
                                   @RequestBody(required = false) PublishRequest req) {
        return chapterPublishService.submitForPublish(SecurityUtils.requirePrincipal(), id, req);
    }
}
