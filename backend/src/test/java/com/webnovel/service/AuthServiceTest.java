package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.RefreshToken;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.auth.AuthResponse;
import com.webnovel.dto.auth.LoginRequest;
import com.webnovel.dto.auth.RegisterRequest;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.exception.ApiException;
import com.webnovel.exception.ConflictException;
import com.webnovel.repository.RefreshTokenRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.JwtService;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Unit tests for the auth flows (FR-1.x) with mocked repositories. */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository users;
    @Mock RefreshTokenRepository refreshTokens;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS) UserService userService;

    PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    JwtService jwtService;
    AuthService service;

    AppProperties props = new AppProperties(
            new AppProperties.Jwt("unit-test-secret-value-at-least-32-bytes!!",
                    Duration.ofMinutes(15), Duration.ofDays(30)),
            new BigDecimal("20"), new BigDecimal("5000"), new BigDecimal("5000"), 30,
            new AppProperties.Cors(List.of("http://localhost:5173")),
            new AppProperties.Uploads("images"));

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(props);
        service = new AuthService(users, refreshTokens, passwordEncoder, jwtService, userService, props);
    }

    private User persistedUser(String rawPassword) {
        User u = new User();
        u.setId(1L);
        u.setUsername("alice");
        u.setEmail("alice@example.com");
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        u.setRole(Role.reader);
        u.setStatus(UserStatus.approved);
        return u;
    }

    @Test
    void register_createsReaderApproved_andIssuesTokens() {
        when(users.existsByEmail(any())).thenReturn(false);
        when(users.existsByUsername(any())).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(userService.toResponse(any())).thenReturn(
                new UserResponse(1L, "alice", "alice@example.com", Role.reader, UserStatus.approved, false));

        AuthResponse res = service.register(
                new RegisterRequest("alice", "alice@example.com", "password123"));

        assertThat(res.accessToken()).isNotBlank();
        assertThat(res.refreshToken()).isNotBlank();
        assertThat(res.user().role()).isEqualTo(Role.reader);
        assertThat(res.user().status()).isEqualTo(UserStatus.approved);
    }

    @Test
    void register_duplicateEmail_throwsConflict() {
        when(users.existsByEmail("alice@example.com")).thenReturn(true);
        assertThatThrownBy(() -> service.register(
                new RegisterRequest("alice", "alice@example.com", "password123")))
                .isInstanceOf(ConflictException.class)
                .extracting("messageKey").isEqualTo("auth.email_taken");
    }

    @Test
    void login_wrongPassword_throwsUnauthorized() {
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(persistedUser("password123")));
        assertThatThrownBy(() -> service.login(new LoginRequest("alice@example.com", "wrongpass")))
                .isInstanceOf(ApiException.class)
                .extracting("messageKey").isEqualTo("auth.invalid_credentials");
    }

    @Test
    void login_blockedUser_throwsForbidden() {
        User u = persistedUser("password123");
        u.setStatus(UserStatus.banned);
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> service.login(new LoginRequest("alice@example.com", "password123")))
                .isInstanceOf(ApiException.class)
                .extracting("messageKey").isEqualTo("auth.account_blocked");
    }

    @Test
    void refresh_unknownToken_throwsUnauthorized() {
        when(refreshTokens.findByTokenHash(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.refresh("does-not-exist"))
                .isInstanceOf(ApiException.class)
                .extracting("messageKey").isEqualTo("auth.invalid_refresh_token");
    }

    @Test
    void refresh_expiredToken_isDeletedAndRejected() {
        RefreshToken expired = new RefreshToken();
        expired.setUserId(1L);
        expired.setTokenHash(jwtService.hashRefreshToken("raw"));
        expired.setExpiresAt(OffsetDateTime.now().minusDays(1));
        when(refreshTokens.findByTokenHash(any())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.refresh("raw"))
                .isInstanceOf(ApiException.class)
                .extracting("messageKey").isEqualTo("auth.invalid_refresh_token");
    }
}
