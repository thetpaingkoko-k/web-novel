package com.webnovel.service;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.Role;
import com.webnovel.dto.content.BookCreateRequest;
import com.webnovel.dto.content.BookDetailResponse;
import com.webnovel.dto.content.BookListItem;
import com.webnovel.dto.content.BookUpdateRequest;
import com.webnovel.dto.content.ChapterSummary;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Book creation/update and public reads (FR-2.1–2.4). */
@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository books;
    private final ChapterRepository chapters;
    private final UserRepository users;
    private final AuthorProfileRepository authorProfiles;

    @Transactional
    public BookDetailResponse create(AppUserPrincipal principal, BookCreateRequest req) {
        requireAuthor(principal);
        Book book = new Book();
        book.setAuthorId(principal.getId());
        book.setTitle(req.title());
        book.setSynopsis(req.synopsis());
        book.setGenre(req.genre());
        book.setCoverImageUrl(req.coverImageUrl());
        book.setStatus(req.status() != null ? req.status() : BookStatus.draft);
        book.setPremium(resolvePremium(principal, req.isPremium()));
        books.save(book);
        return toDetail(book, List.of());
    }

    @Transactional
    public BookDetailResponse update(AppUserPrincipal principal, Long bookId, BookUpdateRequest req) {
        Book book = books.findById(bookId).orElseThrow(() -> new NotFoundException("book.not_found"));
        requireOwnerOrAdmin(principal, book);
        book.setTitle(req.title());
        book.setSynopsis(req.synopsis());
        book.setGenre(req.genre());
        book.setCoverImageUrl(req.coverImageUrl());
        if (req.status() != null) {
            book.setStatus(req.status());
        }
        book.setPremium(resolvePremium(principal, req.isPremium()));
        return toDetail(book, chapterSummaries(book, viewerCanSeeUnpublished(principal, book)));
    }

    @Transactional(readOnly = true)
    public List<BookListItem> browse(String genre, BookStatus status, String search) {
        return books.browse(genre, status, toSearchPattern(search));
    }

    /**
     * Blank → null (no filter); otherwise a lower-cased {@code %term%} LIKE pattern
     * with wildcards escaped so the term matches as a literal substring.
     */
    static String toSearchPattern(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String escaped = search.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    @Transactional(readOnly = true)
    public List<BookListItem> byAuthor(Long authorId) {
        return books.findByAuthor(authorId);
    }

    @Transactional(readOnly = true)
    public BookDetailResponse getDetail(Long bookId, Optional<AppUserPrincipal> viewer) {
        Book book = books.findById(bookId).orElseThrow(() -> new NotFoundException("book.not_found"));
        boolean privileged = viewer.map(v -> canSeeUnpublished(v, book)).orElse(false);
        if (book.getStatus() == BookStatus.draft && !privileged) {
            throw new NotFoundException("book.not_found"); // don't leak drafts
        }
        return toDetail(book, chapterSummaries(book, privileged));
    }

    // --- helpers ---

    boolean resolvePremium(AppUserPrincipal principal, boolean requested) {
        if (!requested) {
            return false;
        }
        // FR-2.4: only monetization-enabled professionals may mark a book premium
        boolean allowed = authorProfiles.findByUserId(principal.getId())
                .map(p -> p.isMonetizationEnabled())
                .orElse(false);
        if (!allowed) {
            throw new BadRequestException("content.premium_requires_monetization");
        }
        return true;
    }

    private void requireAuthor(AppUserPrincipal principal) {
        if (!(principal.getRole() == Role.hobbyist_author
                || principal.getRole() == Role.professional_author
                || principal.isAdmin())) {
            throw new ForbiddenException("content.not_author");
        }
    }

    private void requireOwnerOrAdmin(AppUserPrincipal principal, Book book) {
        if (!principal.isAdmin() && !book.getAuthorId().equals(principal.getId())) {
            throw new ForbiddenException("content.not_author");
        }
    }

    private boolean viewerCanSeeUnpublished(AppUserPrincipal principal, Book book) {
        return canSeeUnpublished(principal, book);
    }

    private boolean canSeeUnpublished(AppUserPrincipal principal, Book book) {
        return principal.isAdmin() || book.getAuthorId().equals(principal.getId());
    }

    private List<ChapterSummary> chapterSummaries(Book book, boolean includeUnpublished) {
        List<Chapter> list = includeUnpublished
                ? chapters.findByBookIdOrderByChapterNumberAsc(book.getId())
                : chapters.findByBookIdAndStatusOrderByChapterNumberAsc(book.getId(), ChapterStatus.published);
        return list.stream().map(c -> new ChapterSummary(
                c.getId(), c.getChapterNumber(), c.getTitle(), c.getStatus(),
                c.getLikeCount(), c.getUniqueViewCount(), c.getCompletionCount(),
                c.getPublishedAt())).toList();
    }

    private BookDetailResponse toDetail(Book book, List<ChapterSummary> chapterSummaries) {
        String username = users.findById(book.getAuthorId()).map(User::getUsername).orElse(null);
        return new BookDetailResponse(
                book.getId(), book.getAuthorId(), username, book.getTitle(), book.getSynopsis(),
                book.getGenre(), book.getCoverImageUrl(), book.getStatus(), book.isPremium(),
                book.getCreatedAt(), chapterSummaries);
    }
}
