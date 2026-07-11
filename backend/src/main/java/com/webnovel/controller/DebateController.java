package com.webnovel.controller;

import com.webnovel.dto.debate.CreatePostRequest;
import com.webnovel.dto.debate.CreateThreadRequest;
import com.webnovel.dto.debate.LockRequest;
import com.webnovel.dto.debate.PostResponse;
import com.webnovel.dto.debate.ThreadResponse;
import com.webnovel.dto.debate.VoteRequest;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.DebateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Book-level debate engine (PROJECT SPEC.md §10.5). */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Debates")
public class DebateController {

    private final DebateService debates;

    /** Start a discussion (FR-9.1/9.2). 409 already_has_thread | book_window_full on refusal. */
    @PostMapping("/books/{id}/debates")
    public ResponseEntity<ThreadResponse> createThread(
            @PathVariable Long id, @Valid @RequestBody CreateThreadRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(debates.createThread(SecurityUtils.requirePrincipal(), id, req));
    }

    @GetMapping("/books/{id}/debates")
    public List<ThreadResponse> listThreads(@PathVariable Long id) {
        return debates.listThreads(id);
    }

    @GetMapping("/debates/{id}")
    public ThreadResponse getThread(@PathVariable Long id) {
        return debates.getThread(id);
    }

    @GetMapping("/debates/{id}/posts")
    public List<PostResponse> listPosts(@PathVariable Long id) {
        return debates.listPosts(id, SecurityUtils.currentPrincipal());
    }

    @PostMapping("/debates/{id}/posts")
    public ResponseEntity<PostResponse> addPost(
            @PathVariable Long id, @Valid @RequestBody CreatePostRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(debates.addPost(SecurityUtils.requirePrincipal(), id, req));
    }

    @PostMapping("/posts/{id}/vote")
    public PostResponse vote(@PathVariable Long id, @Valid @RequestBody VoteRequest req) {
        return debates.vote(SecurityUtils.requirePrincipal(), id, req);
    }

    /** Lock/archive/reopen — authorized for an admin or the thread's creator, enforced in the service. */
    @PutMapping("/debates/{id}/lock")
    public ThreadResponse setStatus(@PathVariable Long id, @Valid @RequestBody LockRequest req) {
        return debates.setStatus(SecurityUtils.requirePrincipal(), id, req);
    }
}
