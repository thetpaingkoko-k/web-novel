package com.webnovel.controller;

import com.webnovel.domain.enums.BookStatus;
import com.webnovel.dto.content.BookCreateRequest;
import com.webnovel.dto.content.BookDetailResponse;
import com.webnovel.dto.content.BookListItem;
import com.webnovel.dto.content.BookUpdateRequest;
import com.webnovel.dto.content.ChapterCreateRequest;
import com.webnovel.dto.content.ChapterResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.BookService;
import com.webnovel.service.ChapterService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Books & chapter upload (PROJECT SPEC.md §10.3). */
@RestController
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
@Tag(name = "Books")
public class BookController {

    private final BookService bookService;
    private final ChapterService chapterService;

    @PostMapping
    public ResponseEntity<BookDetailResponse> create(@Valid @RequestBody BookCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookService.create(SecurityUtils.requirePrincipal(), req));
    }

    @PutMapping("/{id}")
    public BookDetailResponse update(@PathVariable Long id, @Valid @RequestBody BookUpdateRequest req) {
        return bookService.update(SecurityUtils.requirePrincipal(), id, req);
    }

    /** Browse/search. {@code authorId} overrides the other filters ({@code search} included). */
    @GetMapping
    public List<BookListItem> browse(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) BookStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long authorId) {
        return authorId != null ? bookService.byAuthor(authorId)
                : bookService.browse(genre, status, search);
    }

    @GetMapping("/{id}")
    public BookDetailResponse detail(@PathVariable Long id) {
        return bookService.getDetail(id, SecurityUtils.currentPrincipal());
    }

    @PostMapping("/{bookId}/chapters")
    public ResponseEntity<ChapterResponse> uploadChapter(
            @PathVariable Long bookId, @Valid @RequestBody ChapterCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chapterService.create(SecurityUtils.requirePrincipal(), bookId, req));
    }
}
