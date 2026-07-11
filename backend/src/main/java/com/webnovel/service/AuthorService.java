package com.webnovel.service;

import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.author.AuthorApplyRequest;
import com.webnovel.dto.author.AuthorMeResponse;
import com.webnovel.dto.author.AuthorProfileResponse;
import com.webnovel.dto.author.AuthorUpdateRequest;
import com.webnovel.dto.author.SubscriptionPriceResponse;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Author application (FR-1.2) and public author profile (§10.2). */
@Service
@RequiredArgsConstructor
public class AuthorService {

    private final UserRepository users;
    private final AuthorProfileRepository authorProfiles;
    private final UserService userService;

    /** Reader applies to become an author: creates a hobbyist profile and marks the user pending. */
    @Transactional
    public UserResponse apply(Long userId, AuthorApplyRequest req) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("user.not_found"));
        AuthorProfile profile = authorProfiles.findByUserId(userId).orElseGet(() -> {
            AuthorProfile p = new AuthorProfile();
            p.setUserId(userId);
            p.setCareerStage(CareerStage.hobbyist);
            return p;
        });
        profile.setBio(req.bio());
        authorProfiles.save(profile);
        user.setStatus(UserStatus.pending); // §4.1.1: application pending until admin review
        return userService.toResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthorProfileResponse getPublicProfile(Long authorId) {
        User user = users.findById(authorId).orElseThrow(() -> new NotFoundException("user.not_found"));
        AuthorProfile profile = authorProfiles.findByUserId(authorId)
                .orElseThrow(() -> new NotFoundException("user.not_found"));
        return new AuthorProfileResponse(
                user.getId(), user.getUsername(), profile.getBio(), profile.getCareerStage(),
                profile.isMonetizationEnabled(), profile.getMonthlySubscriptionPrice());
    }

    @Transactional(readOnly = true)
    public SubscriptionPriceResponse getSubscriptionPrice(Long authorId) {
        AuthorProfile profile = authorProfiles.findByUserId(authorId)
                .orElseThrow(() -> new NotFoundException("user.not_found"));
        return new SubscriptionPriceResponse(authorId, profile.getMonthlySubscriptionPrice());
    }

    @Transactional(readOnly = true)
    public AuthorMeResponse getMe(Long userId) {
        return toMe(userId, requireProfile(userId));
    }

    /** Author self-update; price is ignored unless monetization is enabled (FR-1.5). */
    @Transactional
    public AuthorMeResponse updateMe(Long userId, AuthorUpdateRequest req) {
        AuthorProfile profile = requireProfile(userId);
        profile.setBio(req.bio());
        if (profile.isMonetizationEnabled() && req.monthlySubscriptionPrice() != null) {
            profile.setMonthlySubscriptionPrice(req.monthlySubscriptionPrice());
        }
        profile.setPayoutWalletProvider(req.payoutWalletProvider());
        profile.setPayoutWalletNumber(req.payoutWalletNumber());
        return toMe(userId, profile);
    }

    private AuthorProfile requireProfile(Long userId) {
        return authorProfiles.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("content.not_author"));
    }

    private AuthorMeResponse toMe(Long userId, AuthorProfile p) {
        String username = users.findById(userId).map(User::getUsername).orElse(null);
        return new AuthorMeResponse(userId, username, p.getBio(), p.getCareerStage(),
                p.isMonetizationEnabled(), p.getMonthlySubscriptionPrice(),
                p.getPayoutWalletProvider(), p.getPayoutWalletNumber(),
                p.getAvailableBalance(), p.getTotalEarned());
    }
}
