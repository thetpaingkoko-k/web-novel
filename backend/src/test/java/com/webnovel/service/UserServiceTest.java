package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Gender;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** UserService.toResponse — the current-user DTO, incl. member-since (contract §3). */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository users;
    @Mock AuthorProfileRepository authorProfiles;
    @InjectMocks UserService service;

    @Test
    void toResponse_carriesProfileDetailAndCreatedAt() {
        OffsetDateTime joined = OffsetDateTime.parse("2025-01-02T03:04:05Z");
        User u = new User();
        u.setId(7L);
        u.setUsername("alice");
        u.setEmail("alice@example.com");
        u.setRole(Role.reader);
        u.setStatus(UserStatus.approved);
        u.setGender(Gender.female);
        u.setDateOfBirth(LocalDate.of(1995, 6, 15));
        u.setCreatedAt(joined);
        when(authorProfiles.findByUserId(7L)).thenReturn(Optional.empty());

        UserResponse res = service.toResponse(u);

        assertThat(res.createdAt()).isEqualTo(joined);
        assertThat(res.gender()).isEqualTo(Gender.female);
        assertThat(res.dateOfBirth()).isEqualTo(LocalDate.of(1995, 6, 15));
        assertThat(res.isMonetizationEnabled()).isFalse();
    }
}
