package com.webnovel.service;

import com.webnovel.domain.entity.AuthorFeedPost;
import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.User;
import com.webnovel.dto.feed.FeedPostRequest;
import com.webnovel.dto.feed.FeedPostResponse;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorFeedPostRepository;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
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
    private final UserRepository users;

    @Transactional
    public FeedPostResponse publish(AppUserPrincipal principal, Long authorId, FeedPostRequest req) {
        if (!principal.isAdmin() && !principal.getId().equals(authorId)) {
            throw new ForbiddenException("content.not_author");
        }
        // FR-11.1: only a monetized (professional) author has subscribers, so only they can
        // gate a post. Rejecting here keeps the flag honest — {@link #list} would otherwise
        // serve a hobbyist's "subscribers only" post to everyone.
        if (req.premiumOnly() && !isMonetized(authorId)) {
            throw new BadRequestException("feed.premium_requires_monetization");
        }
        AuthorFeedPost post = new AuthorFeedPost();
        post.setAuthorId(authorId);
        post.setTitle(req.title());
        post.setContent(req.content());
        post.setPremiumOnly(req.premiumOnly());
        feedPosts.save(post);
        return toResponse(post, users.findById(authorId).orElse(null));
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
        boolean monetized = isMonetized(authorId);
        boolean seesPremium = !monetized || viewer
                .map(v -> v.isAdmin() || v.getId().equals(authorId)
                        || accessControl.hasActiveSubscription(v.getId(), authorId))
                .orElse(false);
        // The whole feed belongs to one author, so resolve the author identity once.
        User author = users.findById(authorId).orElse(null);
        return feedPosts.findByAuthorIdOrderByPublishedAtDesc(authorId).stream()
                .filter(p -> seesPremium || !p.isPremiumOnly())
                .map(p -> toResponse(p, author))
                .toList();
    }

    /** Whether the author can monetize — the precondition for gating a post to subscribers. */
    private boolean isMonetized(Long authorId) {
        return authorProfiles.findByUserId(authorId).map(AuthorProfile::isMonetizationEnabled).orElse(false);
    }

    private static FeedPostResponse toResponse(AuthorFeedPost p, User author) {
        String username = author == null ? null : author.getUsername();
        String avatarUrl = author == null ? null : author.getAvatarUrl();
        return new FeedPostResponse(p.getId(), p.getAuthorId(), username, avatarUrl,
                p.getTitle(), p.getContent(), p.isPremiumOnly(), p.getPublishedAt());
    }
}
