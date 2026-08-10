package com.webnovel.controller;

import com.webnovel.dto.engagement.CommentRequest;
import com.webnovel.dto.engagement.CommentResponse;
import com.webnovel.dto.engagement.LikeResponse;
import com.webnovel.dto.engagement.ProgressResponse;
import com.webnovel.dto.engagement.ProgressUpdateRequest;
import com.webnovel.dto.engagement.RecordViewRequest;
import com.webnovel.dto.engagement.ViewResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.EngagementService;
import com.webnovel.service.ViewTrackingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Chapter views/likes/comments and reading progress (PROJECT SPEC.md §10.4). */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Engagement")
public class EngagementController {

    private final ViewTrackingService viewTracking;
    private final EngagementService engagement;

    /** Record a view (§9.2). Anonymous-capable: free-book reads by unauthenticated users still count. */
    @PostMapping("/chapters/{id}/view")
    public ViewResponse recordView(@PathVariable Long id, @Valid @RequestBody RecordViewRequest req) {
        boolean unique = viewTracking.record(
                id, SecurityUtils.currentPrincipal(), req.sessionId(), req.deviceFingerprint());
        return new ViewResponse(unique);
    }

    @PostMapping("/chapters/{id}/like")
    public LikeResponse like(@PathVariable Long id) {
        return engagement.like(SecurityUtils.requirePrincipal(), id);
    }

    @DeleteMapping("/chapters/{id}/like")
    public LikeResponse unlike(@PathVariable Long id) {
        return engagement.unlike(SecurityUtils.requirePrincipal(), id);
    }

    @PostMapping("/chapters/{id}/comments")
    public ResponseEntity<CommentResponse> comment(
            @PathVariable Long id, @Valid @RequestBody CommentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(engagement.addComment(SecurityUtils.requirePrincipal(), id, req));
    }

    @GetMapping("/chapters/{id}/comments")
    public List<CommentResponse> comments(@PathVariable Long id) {
        return engagement.listComments(id, SecurityUtils.currentPrincipal());
    }

    /** Hard-delete the caller's own comment (§4): it vanishes entirely (replies cascade). 204 on
     * success, 403 if not the author, 404 if missing. */
    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId) {
        engagement.deleteComment(SecurityUtils.requirePrincipal(), commentId);
    }

    @PutMapping("/books/{id}/progress")
    public ProgressResponse updateProgress(
            @PathVariable Long id, @Valid @RequestBody ProgressUpdateRequest req) {
        return engagement.updateProgress(SecurityUtils.requirePrincipal(), id, req);
    }

    @GetMapping("/books/{id}/progress")
    public ProgressResponse getProgress(@PathVariable Long id) {
        return engagement.getProgress(SecurityUtils.requirePrincipal(), id);
    }
}
