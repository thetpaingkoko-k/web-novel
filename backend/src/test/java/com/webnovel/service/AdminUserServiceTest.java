package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.dto.admin.AdminUserRow;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** AdminUserService.list surfaces the author-application answers (contract §2). */
@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock UserRepository users;
    @Mock AuthorProfileRepository authorProfiles;
    @Mock UserService userService;
    @Mock AdminActionService adminActions;
    @Mock NotificationService notifications;
    @Mock AppProperties props;
    @InjectMocks AdminUserService service;

    @BeforeEach
    void authenticateAdmin() {
        // suspend/reactivate audit via SecurityUtils.currentUserId(), which needs a principal.
        AppUserPrincipal admin = new AppUserPrincipal(1L, "admin", Role.admin, false);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null, admin.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static User user(long id, String name) {
        User u = new User();
        u.setId(id);
        u.setUsername(name);
        u.setEmail(name + "@example.com");
        u.setRole(Role.reader);
        u.setStatus(UserStatus.pending);
        return u;
    }

    @Test
    void list_populatesApplicationAnswers_andNullsWithoutProfile() {
        User applicant = user(10L, "applicant"); // has an author profile
        User plain = user(11L, "plain");         // no author profile
        when(users.findByStatusOrderByIdDesc(UserStatus.pending))
                .thenReturn(List.of(applicant, plain));

        AuthorProfile profile = new AuthorProfile();
        profile.setUserId(10L);
        profile.setCareerStage(CareerStage.hobbyist);
        profile.setBio("I write fantasy.");
        profile.setWritingMotivation("To share stories.");
        profile.setWritingInterests("Epic fantasy and sci-fi.");
        when(authorProfiles.findByUserIdIn(List.of(10L, 11L))).thenReturn(List.of(profile));

        List<AdminUserRow> rows = service.list(UserStatus.pending, null);

        AdminUserRow withProfile = rows.stream().filter(r -> r.userId() == 10L).findFirst().orElseThrow();
        assertThat(withProfile.bio()).isEqualTo("I write fantasy.");
        assertThat(withProfile.writingMotivation()).isEqualTo("To share stories.");
        assertThat(withProfile.writingInterests()).isEqualTo("Epic fantasy and sci-fi.");
        assertThat(withProfile.careerStage()).isEqualTo(CareerStage.hobbyist);

        AdminUserRow noProfile = rows.stream().filter(r -> r.userId() == 11L).findFirst().orElseThrow();
        assertThat(noProfile.bio()).isNull();
        assertThat(noProfile.writingMotivation()).isNull();
        assertThat(noProfile.writingInterests()).isNull();
        assertThat(noProfile.careerStage()).isNull();
    }

    @Test
    void suspend_storesReason_andSurfacesItOnTheRow_andAsAuditNote() {
        User target = user(20L, "target");
        target.setStatus(UserStatus.approved);
        when(users.findById(20L)).thenReturn(Optional.of(target));

        service.suspend(20L, false, "Spamming the debate board");

        assertThat(target.getStatus()).isEqualTo(UserStatus.suspended);
        assertThat(target.getSuspensionReason()).isEqualTo("Spamming the debate board");
        verify(adminActions).log(any(), eq(AdminActionType.ban), eq("user"), eq(20L),
                eq("suspend: Spamming the debate board"));

        // the stored reason flows through to the admin user-management row
        when(users.findAllByOrderByIdDesc()).thenReturn(List.of(target));
        when(authorProfiles.findByUserIdIn(List.of(20L))).thenReturn(List.of());
        AdminUserRow row = service.list(null, null).get(0);
        assertThat(row.suspensionReason()).isEqualTo("Spamming the debate board");
    }

    @Test
    void rejectApplication_pending_returnsUserToApprovedReader_andNotifies() {
        User applicant = user(30L, "applicant");
        applicant.setStatus(UserStatus.pending);
        when(users.findById(30L)).thenReturn(Optional.of(applicant));

        service.rejectApplication(30L, "Not a good fit right now");

        assertThat(applicant.getStatus()).isEqualTo(UserStatus.approved);
        verify(adminActions).log(any(), eq(AdminActionType.user_rejection), eq("user"), eq(30L),
                eq("reject_application: Not a good fit right now"));
        verify(notifications).notify(30L, NotificationType.author_rejected, "user", 30L,
                "Not a good fit right now");
    }

    @Test
    void rejectApplication_whenNotPending_isBadRequest() {
        User reader = user(31L, "reader");
        reader.setStatus(UserStatus.approved);
        when(users.findById(31L)).thenReturn(Optional.of(reader));

        assertThatThrownBy(() -> service.rejectApplication(31L, "no"))
                .isInstanceOf(BadRequestException.class);
        assertThat(reader.getStatus()).isEqualTo(UserStatus.approved);
    }

    @Test
    void suspend_admin_isForbidden() {
        User otherAdmin = user(22L, "otheradmin");
        otherAdmin.setRole(Role.admin);
        otherAdmin.setStatus(UserStatus.approved);
        when(users.findById(22L)).thenReturn(Optional.of(otherAdmin));

        assertThatThrownBy(() -> service.suspend(22L, true, "nope"))
                .isInstanceOf(ForbiddenException.class);
        assertThat(otherAdmin.getStatus()).isEqualTo(UserStatus.approved); // unchanged
    }

    @Test
    void reactivate_clearsReason() {
        User target = user(21L, "banned");
        target.setStatus(UserStatus.banned);
        target.setSuspensionReason("Repeated harassment");
        when(users.findById(21L)).thenReturn(Optional.of(target));

        service.reactivate(21L);

        assertThat(target.getStatus()).isEqualTo(UserStatus.approved);
        assertThat(target.getSuspensionReason()).isNull();
    }
}
