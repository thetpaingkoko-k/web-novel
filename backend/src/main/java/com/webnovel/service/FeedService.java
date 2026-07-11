package com.webnovel.service;

import com.webnovel.domain.entity.AuthorFeedPost;
import com.webnovel.dto.feed.FeedPostRequest;
import com.webnovel.dto.feed.FeedPostResponse;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.AuthorFeedPostRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Author content feed (FR-11). Premium-only posts are gated to active subscribers on read. */
@Service
@RequiredArgsConstructor
public class FeedService {

    private final AuthorFeedPostRepository feedPosts;
    private final AccessControlService accessControl;

    @Transactional
    public FeedPostResponse publish(AppUserPrincipal principal, Long authorId, FeedPostRequest req) {
        if (!principal.isAdmin() && !principal.getId().equals(authorId)) {
            throw new ForbiddenException("content.not_author");
        }
        AuthorFeedPost post = new AuthorFeedPost();
        post.setAuthorId(authorId);
        post.setTitle(req.title());
        post.setContent(req.content());
        post.setPremiumOnly(req.premiumOnly());
        feedPosts.save(post);
        return toResponse(post);
    }

    /**
     * Feed for an author. Premium-only posts (FR-11.1) are shown only to the author,
     * admins, and readers with an active subscription to that author (FR-11.2).
     */
    @Transactional(readOnly = true)
    public List<FeedPostResponse> list(Long authorId, Optional<AppUserPrincipal> viewer) {
        boolean seesPremium = viewer
                .map(v -> v.isAdmin() || v.getId().equals(authorId)
                        || accessControl.hasActiveSubscription(v.getId(), authorId))
                .orElse(false);
        return feedPosts.findByAuthorIdOrderByPublishedAtDesc(authorId).stream()
                .filter(p -> seesPremium || !p.isPremiumOnly())
                .map(FeedService::toResponse)
                .toList();
    }

    private static FeedPostResponse toResponse(AuthorFeedPost p) {
        return new FeedPostResponse(p.getId(), p.getAuthorId(), p.getTitle(),
                p.getContent(), p.isPremiumOnly(), p.getPublishedAt());
    }
}
