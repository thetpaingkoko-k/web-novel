package com.webnovel.service;

import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.Genre;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.Role;
import com.webnovel.dto.content.BookCreateRequest;
import com.webnovel.dto.content.BookDetailResponse;
import com.webnovel.dto.content.BookGenreRow;
import com.webnovel.dto.content.BookListItem;
import com.webnovel.dto.content.BookUpdateRequest;
import com.webnovel.dto.content.ChapterSummary;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.BookmarkRepository;
import com.webnovel.repository.ChapterCommentRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
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
    private final BookmarkRepository bookmarks;
    private final ChapterCommentRepository comments;
    private final NotificationService notifications;
    private final AdminActionService adminActions;

    /** Upper bound on browse page size, so a client can't request an unbounded page (§10.3). */
    private static final int MAX_PAGE_SIZE = 100;

    @Transactional
    public BookDetailResponse create(AppUserPrincipal principal, BookCreateRequest req) {
        requireAuthor(principal);
        Book book = new Book();
        book.setAuthorId(principal.getId());
        book.setTitle(req.title());
        book.setSynopsis(req.synopsis());
        book.setGenres(toGenreSet(req.genres()));
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
        // Title is immutable after creation — never set from an update request.
        book.setSynopsis(req.synopsis());
        book.setGenres(toGenreSet(req.genres()));
        book.setCoverImageUrl(req.coverImageUrl());
        if (req.status() != null) {
            book.setStatus(req.status());
        }
        book.setPremium(resolvePremium(principal, req.isPremium()));
        return toDetail(book, chapterSummaries(book, viewerCanSeeUnpublished(principal, book)));
    }

    /** Delete a book and everything under it. Admin-only (child rows cascade at the DB level). */
    @Transactional
    public void delete(AppUserPrincipal principal, Long bookId) {
        if (!principal.isAdmin()) {
            throw new ForbiddenException("content.delete_admin_only");
        }
        Book book = books.findById(bookId).orElseThrow(() -> new NotFoundException("book.not_found"));
        // Tell the author an admin removed their book. The book row — and its title — is about to
        // be gone, so carry the title as the render payload rather than a (soon-dead) book deep link.
        notifications.notify(book.getAuthorId(), NotificationType.book_deleted, null, null, book.getTitle());
        adminActions.log(principal.getId(), AdminActionType.content_removal, "book", bookId, null);
        books.delete(book);
    }

    /**
     * Admin-only: hide a book from public browse ({@code hidden=true}) or restore it
     * ({@code hidden=false}), independent of the report queue. Audited, and — on hide — the
     * author is notified their book was removed. Idempotent: toggling to the current state is a
     * no-op beyond re-asserting it.
     */
    @Transactional
    public void setHidden(AppUserPrincipal principal, Long bookId, boolean hidden) {
        if (!principal.isAdmin()) {
            throw new ForbiddenException("content.hide_admin_only");
        }
        Book book = books.findById(bookId).orElseThrow(() -> new NotFoundException("book.not_found"));
        book.setHidden(hidden);
        // Mirror the report-queue moderation audit: removal on hide, approval (restore) on unhide.
        adminActions.log(principal.getId(),
                hidden ? AdminActionType.content_removal : AdminActionType.content_approval,
                "book", bookId, null);
        if (hidden) {
            notifications.notify(book.getAuthorId(), NotificationType.content_removed,
                    "book", bookId, book.getTitle());
        }
    }

    /** One page of browse results plus the total match count (drives §10.3 pagination). */
    public record BooksPage(List<BookListItem> items, long totalItems) {}

    @Transactional(readOnly = true)
    public BooksPage browse(String genre, BookStatus status, String search,
                            int page, int size, boolean includeHidden) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        var result = books.browse(parseGenre(genre), status, toSearchPattern(search), includeHidden,
                org.springframework.data.domain.PageRequest.of(safePage, safeSize));
        return new BooksPage(populateGenres(result.getContent(), books), result.getTotalElements());
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
        return populateGenres(books.findByAuthor(authorId), books);
    }

    @Transactional(readOnly = true)
    public BookDetailResponse getDetail(Long bookId, Optional<AppUserPrincipal> viewer) {
        Book book = books.findById(bookId).orElseThrow(() -> new NotFoundException("book.not_found"));
        boolean privileged = viewer.map(v -> canSeeUnpublished(v, book)).orElse(false);
        if ((book.getStatus() == BookStatus.draft || book.isHidden()) && !privileged) {
            throw new NotFoundException("book.not_found"); // don't leak drafts or admin-hidden books
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
        Set<Long> previewIds = previewChapterIds(book, list);
        // Readers see a gapless sequence: the published-only list is numbered by position so a
        // rejected/removed chapter leaves no hole. Author/admin (includeUnpublished) keep the
        // true stored numbers so drafts and rejections stay identifiable.
        List<ChapterSummary> summaries = new ArrayList<>(list.size());
        for (int i = 0; i < list.size(); i++) {
            Chapter c = list.get(i);
            int number = includeUnpublished ? c.getChapterNumber() : i + 1;
            summaries.add(new ChapterSummary(
                    c.getId(), number, c.getTitle(), c.getStatus(),
                    c.getLikeCount(), c.getUniqueViewCount(), c.getCompletionCount(),
                    c.getPublishedAt(), previewIds.contains(c.getId())));
        }
        return summaries;
    }

    /**
     * The free-preview chapter ids for a premium book: the first
     * {@code max(1, round(publishedCount * 10%))} published chapters ordered by
     * chapterNumber ascending (§9.1). Empty for free books. Computed in-memory from the
     * already-loaded chapter list to avoid per-row queries.
     */
    private Set<Long> previewChapterIds(Book book, List<Chapter> loaded) {
        if (!book.isPremium()) {
            return Set.of();
        }
        List<Chapter> published = loaded.stream()
                .filter(c -> c.getStatus() == ChapterStatus.published)
                .sorted(Comparator.comparing(Chapter::getChapterNumber))
                .toList();
        if (published.isEmpty()) {
            return Set.of();
        }
        long n = AccessControlService.previewCount(published.size());
        return published.stream().limit(n).map(Chapter::getId).collect(Collectors.toSet());
    }

    private BookDetailResponse toDetail(Book book, List<ChapterSummary> chapterSummaries) {
        String username = users.findById(book.getAuthorId()).map(User::getUsername).orElse(null);
        CareerStage careerStage = authorProfiles.findByUserId(book.getAuthorId())
                .map(AuthorProfile::getCareerStage).orElse(null);
        // Book-level engagement totals, shown to every viewer (§4.1.1). Views are the book's own
        // denormalized counter (§9.2); likes/comments are aggregated over the book's published
        // chapters so the numbers are identical regardless of who is looking.
        long viewCount = book.getViewCount();
        long likeCount = chapters.sumLikeCountByBookId(book.getId());
        long bookmarkCount = bookmarks.countByBookId(book.getId());
        long commentCount = comments.countVisibleByBookId(book.getId());
        return new BookDetailResponse(
                book.getId(), book.getAuthorId(), username, careerStage, book.getTitle(), book.getSynopsis(),
                new ArrayList<>(book.getGenres()), book.getCoverImageUrl(), book.getStatus(), book.isPremium(),
                book.isHidden(), book.getCreatedAt(),
                viewCount, likeCount, bookmarkCount, commentCount, chapterSummaries);
    }

    /** Copies the requested genres into a fresh set (null → empty), preserving order. */
    private static Set<Genre> toGenreSet(List<Genre> genres) {
        return genres == null ? new LinkedHashSet<>() : new LinkedHashSet<>(genres);
    }

    /** Blank/unknown genre filter → null (no restriction); otherwise the matching enum. */
    static Genre parseGenre(String genre) {
        if (genre == null || genre.isBlank()) {
            return null;
        }
        try {
            return Genre.valueOf(genre.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Fills each row's genres in ONE batch query (a JPQL constructor projection can't
     * build a per-row collection). Shared with {@code BookmarkService}.
     */
    static List<BookListItem> populateGenres(List<BookListItem> items, BookRepository books) {
        if (items.isEmpty()) {
            return items;
        }
        List<Long> ids = items.stream().map(BookListItem::bookId).toList();
        Map<Long, List<Genre>> byBook = new HashMap<>();
        for (BookGenreRow row : books.findGenresByBookIds(ids)) {
            byBook.computeIfAbsent(row.bookId(), k -> new ArrayList<>()).add(row.genre());
        }
        return items.stream()
                .map(i -> i.withGenres(byBook.getOrDefault(i.bookId(), List.of())))
                .toList();
    }
}
