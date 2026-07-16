package com.webnovel.controller;

import com.webnovel.dto.content.BookListItem;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.BookmarkService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Saved books / "My List" (§4.1.1). Reader-owned feature (§5); readers only. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@PreAuthorize("hasRole('READER')")
@Tag(name = "Bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping("/bookmarks/me")
    public List<BookListItem> myBookmarks() {
        return bookmarkService.myBookmarks(SecurityUtils.requirePrincipal());
    }

    @PostMapping("/books/{id}/bookmark")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void bookmark(@PathVariable Long id) {
        bookmarkService.add(SecurityUtils.requirePrincipal(), id);
    }

    @DeleteMapping("/books/{id}/bookmark")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unbookmark(@PathVariable Long id) {
        bookmarkService.remove(SecurityUtils.requirePrincipal(), id);
    }
}
