package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.RefreshToken;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Gender;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.domain.enums.AuthProvider;
import java.time.LocalDate;
import com.webnovel.dto.auth.AuthResponse;
import com.webnovel.dto.auth.GoogleLoginRequest;
import com.webnovel.dto.auth.LoginRequest;
import com.webnovel.dto.auth.RegisterRequest;
import com.webnovel.dto.auth.RegistrationResponse;
import com.webnovel.dto.auth.VerifyEmailRequest;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.exception.ApiException;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.repository.RefreshTokenRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.GoogleTokenVerifier;
import com.webnovel.security.GoogleTokenVerifier.GoogleUser;
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
import org.mockito.ArgumentCaptor;
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
            new BigDecimal("20"), new BigDecimal("5000"), new BigDecimal("5000"), 30, 3,
            new AppProperties.Cors(List.of("http://localhost:5173")),
            new AppProperties.Uploads("images"),
            new AppProperties.Google("client-id.apps.googleusercontent.com"),
            new AppProperties.Mail("noreply@test", "", false,
                    Duration.ofMinutes(10), Duration.ofSeconds(60)));

    @Mock GoogleTokenVerifier googleTokenVerifier;
    @Mock EmailVerificationService emailVerification;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(props);
        service = new AuthService(users, refreshTokens, passwordEncoder, jwtService,
                googleTokenVerifier, emailVerification, userService, props);
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
    void register_createsPendingReader_withoutSendingCode() {
        when(users.findByEmail(any())).thenReturn(Optional.empty());
        when(users.existsByUsername(any())).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        RegistrationResponse res = service.register(
                new RegisterRequest("alice", "alice@example.com", "password123",
                        Gender.male, LocalDate.of(1990, 1, 1), true));

        assertThat(res.email()).isEqualTo("alice@example.com");
        assertThat(res.verificationRequired()).isTrue();
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(UserStatus.pending);
        assertThat(saved.getValue().getAuthProvider()).isEqualTo(AuthProvider.LOCAL);
        // The code is sent when the client reaches the verify screen (/resend-code),
        // not during registration.
        verifyNoInteractions(emailVerification);
    }

    @Test
    void register_verifiedEmail_throwsConflict() {
        User verified = new User();
        verified.setEmail("alice@example.com");
        verified.setStatus(UserStatus.approved);
        verified.setAuthProvider(AuthProvider.LOCAL);
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(verified));
        assertThatThrownBy(() -> service.register(
                new RegisterRequest("alice", "alice@example.com", "password123",
                        Gender.male, LocalDate.of(1990, 1, 1), true)))
                .isInstanceOf(ConflictException.class)
                .extracting("messageKey").isEqualTo("auth.email_taken");
    }

    @Test
    void register_googleEmail_throwsConflictPointingToGoogle() {
        User google = new User();
        google.setEmail("g@example.com");
        google.setStatus(UserStatus.approved);
        google.setAuthProvider(AuthProvider.GOOGLE);
        when(users.findByEmail("g@example.com")).thenReturn(Optional.of(google));
        assertThatThrownBy(() -> service.register(
                new RegisterRequest("guser", "g@example.com", "password123",
                        Gender.male, LocalDate.of(1990, 1, 1), true)))
                .isInstanceOf(ConflictException.class)
                .extracting("messageKey").isEqualTo("auth.email_registered_with_google");
    }

    @Test
    void register_pendingEmail_resumesWithoutConflict() {
        User pending = new User();
        pending.setId(7L);
        pending.setUsername("aliceold");
        pending.setEmail("alice@example.com");
        pending.setStatus(UserStatus.pending);
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(pending));
        when(users.existsByUsername("alice")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        RegistrationResponse res = service.register(
                new RegisterRequest("alice", "alice@example.com", "newpassword123",
                        Gender.female, LocalDate.of(1992, 5, 6), true));

        assertThat(res.email()).isEqualTo("alice@example.com");
        assertThat(res.verificationRequired()).isTrue();
        // No new account — the existing pending one is reused with refreshed creds.
        assertThat(pending.getUsername()).isEqualTo("alice");
        assertThat(passwordEncoder.matches("newpassword123", pending.getPasswordHash())).isTrue();
        // Still no send here; the verify screen emails the code (/resend-code).
        verifyNoInteractions(emailVerification);
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
    void login_pendingUser_throwsEmailNotVerified() {
        User u = persistedUser("password123");
        u.setStatus(UserStatus.pending);
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> service.login(new LoginRequest("alice@example.com", "password123")))
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo(ErrorCode.email_not_verified);
    }

    @Test
    void verifyEmail_validCode_approvesAndIssuesTokens() {
        User u = persistedUser("password123");
        u.setStatus(UserStatus.pending);
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(u));
        when(userService.toResponse(any())).thenReturn(
                new UserResponse(1L, "alice", "alice@example.com", Role.reader, UserStatus.approved, false,
                        null, null, null, null));

        AuthResponse res = service.verifyEmail(new VerifyEmailRequest("alice@example.com", "123456"));

        assertThat(res.accessToken()).isNotBlank();
        assertThat(u.getStatus()).isEqualTo(UserStatus.approved);
        verify(emailVerification).verifyAndConsume(u, "123456");
    }

    @Test
    void verifyEmail_alreadyApproved_throwsAlreadyVerified() {
        User u = persistedUser("password123"); // approved by default
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> service.verifyEmail(new VerifyEmailRequest("alice@example.com", "123456")))
                .isInstanceOf(ConflictException.class)
                .extracting("code").isEqualTo(ErrorCode.already_verified);
    }

    @Test
    void login_pastDeviceLimit_evictsOldestSession() {
        User u = persistedUser("password123");
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(u));
        when(userService.toResponse(any())).thenReturn(
                new UserResponse(1L, "alice", "alice@example.com", Role.reader, UserStatus.approved, false,
                        null, null, null, null));
        // Three existing sessions (oldest first); the limit is 3, so the 4th login evicts the oldest.
        RefreshToken oldest = session(10L);
        RefreshToken mid = session(11L);
        RefreshToken newest = session(12L);
        when(refreshTokens.findByUserIdOrderByCreatedAtAscIdAsc(1L))
                .thenReturn(List.of(oldest, mid, newest));

        service.login(new LoginRequest("alice@example.com", "password123"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<RefreshToken>> evicted = ArgumentCaptor.forClass(List.class);
        verify(refreshTokens).deleteAll(evicted.capture());
        assertThat(evicted.getValue()).containsExactly(oldest); // only the single oldest gives way
        verify(refreshTokens).save(any(RefreshToken.class));    // the new session is still issued
    }

    private static RefreshToken session(long id) {
        RefreshToken t = new RefreshToken();
        t.setId(id);
        return t;
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

    // ---- Google Sign-In (rule B: create-or-login, reject on collision) ----

    private void stubGoogle(String email, boolean verified) {
        when(googleTokenVerifier.verify("tok"))
                .thenReturn(new GoogleUser(email, verified, "New User", "google-sub-123"));
    }

    @Test
    void google_newEmail_autoCreatesGoogleReader_andIssuesTokens() {
        stubGoogle("newbie@gmail.com", true);
        when(users.findByEmail("newbie@gmail.com")).thenReturn(Optional.empty());
        when(users.existsByUsername(any())).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(9L);
            return u;
        });
        when(userService.toResponse(any())).thenReturn(
                new UserResponse(9L, "newbie", "newbie@gmail.com", Role.reader, UserStatus.approved, false,
                        null, null, null, null));

        AuthResponse res = service.loginWithGoogle(new GoogleLoginRequest("tok"));

        assertThat(res.accessToken()).isNotBlank();
        assertThat(res.refreshToken()).isNotBlank();
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(saved.getValue().getPasswordHash()).isNull();
        assertThat(saved.getValue().getRole()).isEqualTo(Role.reader);
        assertThat(saved.getValue().getStatus()).isEqualTo(UserStatus.approved);
        assertThat(saved.getValue().getUsername()).isEqualTo("newbie");
    }

    @Test
    void google_existingGoogleUser_logsInWithoutCreating() {
        stubGoogle("alice@example.com", true);
        User existing = persistedUser("irrelevant");
        existing.setAuthProvider(AuthProvider.GOOGLE);
        existing.setPasswordHash(null);
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(existing));
        when(userService.toResponse(any())).thenReturn(
                new UserResponse(1L, "alice", "alice@example.com", Role.reader, UserStatus.approved, false,
                        null, null, null, null));

        AuthResponse res = service.loginWithGoogle(new GoogleLoginRequest("tok"));

        assertThat(res.accessToken()).isNotBlank();
        verify(users, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void google_emailBelongsToPasswordAccount_throwsConflict() {
        stubGoogle("alice@example.com", true);
        User local = persistedUser("password123"); // authProvider defaults to LOCAL
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(local));

        assertThatThrownBy(() -> service.loginWithGoogle(new GoogleLoginRequest("tok")))
                .isInstanceOf(ConflictException.class)
                .extracting("code").isEqualTo(ErrorCode.email_registered_with_password);
    }

    @Test
    void google_unverifiedEmail_throwsUnauthorized() {
        stubGoogle("spoofed@gmail.com", false);

        assertThatThrownBy(() -> service.loginWithGoogle(new GoogleLoginRequest("tok")))
                .isInstanceOf(ApiException.class)
                .extracting("messageKey").isEqualTo("auth.google_email_unverified");
    }
}
