package com.webnovel.controller;

import com.webnovel.dto.feed.FeedPostRequest;
import com.webnovel.dto.feed.FeedPostResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.FeedService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Author content feed (PROJECT SPEC.md §10.8, FR-11). */
@RestController
@RequestMapping("/api/v1/authors/{id}/feed")
@RequiredArgsConstructor
@Tag(name = "Author Feed")
public class FeedController {

    private final FeedService feed;

    @PostMapping
    public ResponseEntity<FeedPostResponse> publish(
            @PathVariable Long id, @Valid @RequestBody FeedPostRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feed.publish(SecurityUtils.requirePrincipal(), id, req));
    }

    @GetMapping
    public List<FeedPostResponse> list(@PathVariable Long id) {
        return feed.list(id, SecurityUtils.currentPrincipal());
    }

    @DeleteMapping("/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @PathVariable Long postId) {
        feed.delete(SecurityUtils.requirePrincipal(), id, postId);
    }
}
