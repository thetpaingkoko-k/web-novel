package com.webnovel.service;

import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.admin.AdminUserRow;
import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.SecurityUtils;
import java.time.OffsetDateTime;
import java.util.List;
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
                profile.setApprovedAt(OffsetDateTime.now());
                user.setRole(Role.professional_author);
                user.setStatus(UserStatus.approved);
            }
            default -> throw new BadRequestException("error.validation");
        }
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.user_approval,
                "user", userId, req.kind().name());
        return userService.toResponse(user);
    }

    /**
     * User management (FR-1.4/13.1): the pending-approval queue ({@code status=pending}),
     * a username/email search, or all users (no filter).
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
        return found.stream()
                .map(u -> new AdminUserRow(u.getId(), u.getUsername(), u.getEmail(),
                        u.getRole(), u.getStatus()))
                .toList();
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
