package com.webnovel.service;

import com.webnovel.domain.entity.AuthorFeedPost;
import com.webnovel.dto.feed.FeedPostRequest;
import com.webnovel.dto.feed.FeedPostResponse;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorFeedPostRepository;
import com.webnovel.repository.AuthorProfileRepository;
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
    private final AuthorProfileRepository authorProfiles;
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

    /** Delete a feed post. Allowed for the post's author or an admin (FR-11). */
    @Transactional
    public void delete(AppUserPrincipal principal, Long authorId, Long postId) {
        AuthorFeedPost post = feedPosts.findById(postId)
                .orElseThrow(() -> new NotFoundException("feed.post_not_found"));
        if (!post.getAuthorId().equals(authorId)) {
            throw new NotFoundException("feed.post_not_found");
        }
        if (!principal.isAdmin() && !principal.getId().equals(post.getAuthorId())) {
            throw new ForbiddenException("content.not_author");
        }
        feedPosts.delete(post);
    }

    /**
     * Feed for an author. Premium-only posts (FR-11.1) are shown only to the author,
     * admins, and readers with an active subscription to that author (FR-11.2).
     * Only monetized (professional) authors can gate posts — a hobbyist can't monetize,
     * so their entire feed is free to any viewer regardless of subscription.
     */
    @Transactional(readOnly = true)
    public List<FeedPostResponse> list(Long authorId, Optional<AppUserPrincipal> viewer) {
        boolean monetized = authorProfiles.findByUserId(authorId)
                .map(p -> p.isMonetizationEnabled()).orElse(false);
        boolean seesPremium = !monetized || viewer
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
