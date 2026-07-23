package com.webnovel.controller;

import com.webnovel.domain.enums.BookStatus;
import com.webnovel.dto.content.AudioTrack;
import com.webnovel.dto.content.BookCreateRequest;
import com.webnovel.dto.content.BookDetailResponse;
import com.webnovel.dto.content.BookListItem;
import com.webnovel.dto.content.BookUpdateRequest;
import com.webnovel.dto.content.ChapterCreateRequest;
import com.webnovel.dto.content.ChapterResponse;
import com.webnovel.dto.engagement.RecordViewRequest;
import com.webnovel.dto.engagement.ViewResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.BookService;
import com.webnovel.service.ChapterService;
import com.webnovel.service.ViewTrackingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Books & chapter upload (PROJECT SPEC.md §10.3). */
@RestController
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
@Tag(name = "Books")
public class BookController {

    private final BookService bookService;
    private final ChapterService chapterService;
    private final ViewTrackingService viewTracking;

    @PostMapping
    @PreAuthorize("hasAnyRole('HOBBYIST_AUTHOR','PROFESSIONAL_AUTHOR')")
    public ResponseEntity<BookDetailResponse> create(@Valid @RequestBody BookCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookService.create(SecurityUtils.requirePrincipal(), req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HOBBYIST_AUTHOR','PROFESSIONAL_AUTHOR')")
    public BookDetailResponse update(@PathVariable Long id, @Valid @RequestBody BookUpdateRequest req) {
        return bookService.update(SecurityUtils.requirePrincipal(), id, req);
    }

    /**
     * Browse/search. {@code authorId} overrides the other filters ({@code search} included) and
     * returns the author's full list unpaginated; otherwise results are paginated ({@code page}/
     * {@code size}) with the total match count in the {@code X-Total-Count} response header (§10.3).
     */
    @GetMapping
    public ResponseEntity<List<BookListItem>> browse(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) BookStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long authorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        if (authorId != null) {
            return ResponseEntity.ok(bookService.byAuthor(authorId));
        }
        // Admins browse with hidden books included (badged + unhideable); everyone else sees the
        // public listing only.
        boolean includeHidden = SecurityUtils.currentPrincipal()
                .map(com.webnovel.security.AppUserPrincipal::isAdmin).orElse(false);
        BookService.BooksPage result = bookService.browse(genre, status, search, page, size, includeHidden);
        return ResponseEntity.ok()
                .header("X-Total-Count", Long.toString(result.totalItems()))
                .body(result.items());
    }

    @GetMapping("/{id}")
    public BookDetailResponse detail(@PathVariable Long id) {
        return bookService.getDetail(id, SecurityUtils.currentPrincipal());
    }

    /**
     * The book's audiobook playlist: published chapters that carry narration audio, in order.
     * Premium tracks the caller can't play are listed without a URL ({@code locked: true}).
     */
    @GetMapping("/{id}/audio-playlist")
    public List<AudioTrack> audioPlaylist(@PathVariable Long id) {
        return bookService.audioPlaylist(id, SecurityUtils.currentPrincipal());
    }

    /** Record a book-level view (§9.2). Anonymous-capable, like chapter views. */
    @PostMapping("/{id}/view")
    public ViewResponse recordView(@PathVariable Long id, @Valid @RequestBody RecordViewRequest req) {
        boolean unique = viewTracking.recordBookView(
                id, SecurityUtils.currentPrincipal(), req.sessionId(), req.deviceFingerprint());
        return new ViewResponse(unique);
    }

    /** Delete a book (admin only). Chapters and all related rows cascade. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        bookService.delete(SecurityUtils.requirePrincipal(), id);
    }

    /** Hide a book from public browse (admin only); audited. */
    @PutMapping("/{id}/hide")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void hide(@PathVariable Long id) {
        bookService.setHidden(SecurityUtils.requirePrincipal(), id, true);
    }

    /** Restore a hidden book to public browse (admin only); audited. */
    @PutMapping("/{id}/unhide")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unhide(@PathVariable Long id) {
        bookService.setHidden(SecurityUtils.requirePrincipal(), id, false);
    }

    @PostMapping("/{bookId}/chapters")
    @PreAuthorize("hasAnyRole('HOBBYIST_AUTHOR','PROFESSIONAL_AUTHOR')")
    public ResponseEntity<ChapterResponse> uploadChapter(
            @PathVariable Long bookId, @Valid @RequestBody ChapterCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chapterService.create(SecurityUtils.requirePrincipal(), bookId, req));
    }
}
