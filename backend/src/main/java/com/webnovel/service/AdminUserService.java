package com.webnovel.service;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.admin.AdminUserRow;
import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.dto.admin.UpgradeRequestRow;
import com.webnovel.dto.author.SubscriptionPriceResponse;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.SecurityUtils;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin user/author approval (FR-1.5, §4.1.1), audited to ADMIN_ACTION (FR-3.5). */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository users;
    private final AuthorProfileRepository authorProfiles;
    private final UserService userService;
    private final AdminActionService adminActions;
    private final NotificationService notifications;
    private final AppProperties props;

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse approve(Long userId, ApproveRequest req) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("user.not_found"));
        AuthorProfile profile = authorProfiles.findByUserId(userId).orElse(null);

        switch (req.kind()) {
            case verify_author -> {
                if (profile == null) {
                    profile = new AuthorProfile();
                    profile.setUserId(userId);
                    profile.setCareerStage(CareerStage.hobbyist);
                    authorProfiles.save(profile);
                }
                user.setRole(Role.hobbyist_author);
                user.setStatus(UserStatus.approved);
            }
            case enable_monetization -> {
                if (profile == null) {
                    throw new BadRequestException("author.not_monetized");
                }
                profile.setMonetizationEnabled(true);
                profile.setCareerStage(CareerStage.professional);
                if (profile.getMonthlySubscriptionPrice() == null) {
                    // Apply the system baseline so the author is immediately subscribable; an
                    // admin can adjust it later via setSubscriptionPrice (FR-1.5).
                    profile.setMonthlySubscriptionPrice(props.baseSubscriptionPriceMmk());
                }
                profile.setApprovedAt(OffsetDateTime.now());
                profile.setProfessionalRequested(false); // clear the upgrade-request queue entry
                user.setRole(Role.professional_author);
                user.setStatus(UserStatus.approved);
            }
            default -> throw new BadRequestException("error.validation");
        }
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.user_approval,
                "user", userId, req.kind().name());
        notifications.notify(userId, NotificationType.upgrade_approved,
                "user", userId, req.kind().name());
        return userService.toResponse(user);
    }

    /**
     * Declines a pending hobbyist→professional upgrade request (§4.1.1): clears the
     * queue flag so it leaves the upgrade queue, leaves the user's role/monetization
     * untouched, audits the decision, and notifies the applicant. 400 if the user has
     * no pending request.
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse rejectUpgrade(Long userId) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("user.not_found"));
        AuthorProfile profile = authorProfiles.findByUserId(userId)
                .filter(AuthorProfile::isProfessionalRequested)
                .orElseThrow(() -> new BadRequestException("author.no_upgrade_request"));
        profile.setProfessionalRequested(false);
        profile.setProfessionalRequestedAt(null);
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.user_rejection,
                "user", userId, "reject_upgrade");
        notifications.notify(userId, NotificationType.upgrade_rejected, "user", userId, null);
        return userService.toResponse(user);
    }

    /**
     * User management (FR-1.4/13.1): the pending-approval queue ({@code status=pending}),
     * a username/email search, or all users (no filter). Rows carry the author's
     * {@code careerStage} ({@code null} for users without an author profile).
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminUserRow> list(UserStatus status, String search) {
        List<User> found;
        if (search != null && !search.isBlank()) {
            found = users.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByIdDesc(
                    search, search);
        } else if (status != null) {
            found = users.findByStatusOrderByIdDesc(status);
        } else {
            found = users.findAllByOrderByIdDesc();
        }
        Map<Long, AuthorProfile> profiles = new HashMap<>();
        if (!found.isEmpty()) {
            authorProfiles.findByUserIdIn(found.stream().map(User::getId).toList())
                    .forEach(p -> profiles.put(p.getUserId(), p));
        }
        return found.stream()
                .map(u -> {
                    AuthorProfile p = profiles.get(u.getId());
                    return new AdminUserRow(u.getId(), u.getUsername(), u.getEmail(),
                            u.getRole(), u.getStatus(),
                            p == null ? null : p.getCareerStage(),
                            p != null && p.isMonetizationEnabled(),
                            p == null ? null : p.getMonthlySubscriptionPrice(),
                            p == null ? null : p.getBio(),
                            p == null ? null : p.getWritingMotivation(),
                            p == null ? null : p.getWritingInterests());
                })
                .toList();
    }

    /**
     * Admin sets a monetized author's monthly subscription price (FR-1.5, §9.3). The price is a
     * system baseline by default and is never author-set; only an admin adjusts it here. Audited.
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public SubscriptionPriceResponse setSubscriptionPrice(Long userId, BigDecimal priceMmk) {
        AuthorProfile profile = authorProfiles.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("author.not_monetized"));
        if (!profile.isMonetizationEnabled()) {
            throw new BadRequestException("author.not_monetized");
        }
        profile.setMonthlySubscriptionPrice(priceMmk);
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.subscription_price_update,
                "user", userId, priceMmk.stripTrailingZeros().toPlainString());
        return new SubscriptionPriceResponse(userId, priceMmk);
    }

    /** Pending hobbyist→professional upgrade requests, oldest first (§4.1.1). */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<UpgradeRequestRow> upgradeRequests() {
        return authorProfiles.findUpgradeRequests();
    }

    /** Suspend ({@code ban=false}) or ban ({@code ban=true}) a user (FR-1.4). Audited. */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse suspend(Long userId, boolean ban) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("user.not_found"));
        user.setStatus(ban ? UserStatus.banned : UserStatus.suspended);
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.ban,
                "user", userId, ban ? "ban" : "suspend");
        return userService.toResponse(user);
    }

    /** Restore a suspended/banned account to {@code approved} (§4.1.1). Audited. */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse reactivate(Long userId) {
        User user = users.findById(userId).orElseThrow(() -> new NotFoundException("user.not_found"));
        user.setStatus(UserStatus.approved);
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.user_approval,
                "user", userId, "reactivate");
        return userService.toResponse(user);
    }
}
