package com.webnovel.service;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.ReadingProgressRepository;
import com.webnovel.repository.SubscriptionRepository;
import com.webnovel.security.AppUserPrincipal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Book-level premium access control (§9.1, FR-4.x). The API is the sole
 * authority; denials carry a machine-readable code and the authorId the reader
 * must subscribe to (FR-4.4) so the frontend can route to the subscribe flow.
 */
@Service
@RequiredArgsConstructor
public class AccessControlService {

    private final SubscriptionRepository subscriptions;
    private final ChapterRepository chapters;
    private final ReadingProgressRepository readingProgress;

    /** Preview fraction: the first 10% of a premium book's published chapters are free. */
    private static final double PREVIEW_FRACTION = 0.10;

    /**
     * Chapter-level access for a single chapter's content. A premium book's first-N
     * published chapters are a free preview (see {@link #isFreePreview}); those bypass
     * the subscription gate entirely. Everything else falls back to book-level gating.
     */
    @Transactional(readOnly = true)
    public void assertCanAccessChapter(Optional<AppUserPrincipal> viewer, Book book, Chapter chapter) {
        if (isFreePreview(book, chapter)) {
            return;
        }
        assertCanAccess(viewer, book);
    }

    /**
     * Whether {@code chapter} is a free preview chapter of a premium book: among the
     * book's published chapters ordered by chapterNumber ascending, the first
     * {@code N = max(1, round(publishedCount * 10%))} are free to everyone. Non-premium
     * books and unpublished chapters are never previews (they're gated/served elsewhere).
     */
    @Transactional(readOnly = true)
    public boolean isFreePreview(Book book, Chapter chapter) {
        if (!book.isPremium() || chapter.getStatus() != ChapterStatus.published) {
            return false;
        }
        long publishedCount = chapters.countByBookIdAndStatus(book.getId(), ChapterStatus.published);
        if (publishedCount <= 0) {
            return false;
        }
        long previewCount = previewCount(publishedCount);
        long rank = chapters.countByBookIdAndStatusAndChapterNumberLessThanEqual(
                book.getId(), ChapterStatus.published, chapter.getChapterNumber());
        return rank <= previewCount;
    }

    /** N = max(1, round(publishedCount * 10%)); at least one preview chapter when any exist. */
    public static long previewCount(long publishedCount) {
        return Math.max(1, Math.round(publishedCount * PREVIEW_FRACTION));
    }

    /**
     * Discussion engagement gate (FR-9): a reader may only start or join a discussion once they
     * have read at least the first 10% of the book — measured as the rank of their furthest-read
     * published chapter vs {@code max(1, round(10%))} of the published chapters (the same fraction
     * as the free preview). The book's own author and admins bypass. Throws {@code must_read_more}
     * with the required/read counts so the frontend can explain the gate.
     */
    @Transactional(readOnly = true)
    public void assertHasReadEnoughToDiscuss(AppUserPrincipal reader, Book book) {
        if (reader.isAdmin() || book.getAuthorId().equals(reader.getId())) {
            return;
        }
        long publishedCount = chapters.countByBookIdAndStatus(book.getId(), ChapterStatus.published);
        if (publishedCount <= 0) {
            return; // nothing published to read yet → nothing to gate on
        }
        long required = previewCount(publishedCount);
        long read = readingProgress.findLastReadChapterNumber(reader.getId(), book.getId())
                .map(number -> chapters.countByBookIdAndStatusAndChapterNumberLessThanEqual(
                        book.getId(), ChapterStatus.published, number))
                .orElse(0L);
        if (read < required) {
            throw new ForbiddenException(ErrorCode.must_read_more, "debate.must_read_more",
                    Map.of("required", required, "read", read));
        }
    }

    @Transactional(readOnly = true)
    public void assertCanAccess(Optional<AppUserPrincipal> viewer, Book book) {
        if (!book.isPremium()) {
            return; // FR-4.1: free books are servable to anyone
        }
        if (viewer.isEmpty()) {
            throw denyNoSubscription(book);
        }
        AppUserPrincipal user = viewer.get();
        if (user.isAdmin() || book.getAuthorId().equals(user.getId())) {
            return; // FR-4.3: the book's own author and admins bypass the check
        }
        Optional<Subscription> sub = subscriptions.findRelevant(user.getId(), book.getAuthorId())
                .stream().findFirst();
        if (sub.isPresent()) {
            Subscription s = sub.get();
            boolean active = s.getStatus() == SubscriptionStatus.active
                    && s.getEndDate() != null
                    && s.getEndDate().isAfter(OffsetDateTime.now());
            if (active) {
                return;
            }
            throw denyExpired(book);
        }
        throw denyNoSubscription(book);
    }

    /** Whether a reader currently holds an active subscription to an author (feed premium gate, FR-11.1). */
    @Transactional(readOnly = true)
    public boolean hasActiveSubscription(Long readerId, Long authorId) {
        return subscriptions.findRelevant(readerId, authorId).stream()
                .findFirst()
                .filter(s -> s.getStatus() == SubscriptionStatus.active
                        && s.getEndDate() != null
                        && s.getEndDate().isAfter(OffsetDateTime.now()))
                .isPresent();
    }

    private ForbiddenException denyNoSubscription(Book book) {
        return new ForbiddenException(ErrorCode.no_subscription, "error.no_subscription",
                Map.of("authorId", book.getAuthorId()));
    }

    private ForbiddenException denyExpired(Book book) {
        return new ForbiddenException(ErrorCode.expired_subscription, "error.expired_subscription",
                Map.of("authorId", book.getAuthorId()));
    }
}
