package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.admin.AdminUserRow;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
}
