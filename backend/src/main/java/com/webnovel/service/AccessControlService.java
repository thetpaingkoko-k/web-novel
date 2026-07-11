package com.webnovel.service;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ForbiddenException;
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
