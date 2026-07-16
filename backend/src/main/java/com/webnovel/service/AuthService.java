package com.webnovel.service;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.RefreshToken;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.AuthProvider;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.auth.AuthResponse;
import com.webnovel.dto.auth.GoogleLoginRequest;
import com.webnovel.dto.auth.LoginRequest;
import com.webnovel.dto.auth.RegisterRequest;
import com.webnovel.dto.auth.RegistrationResponse;
import com.webnovel.dto.auth.ResendCodeRequest;
import com.webnovel.dto.auth.VerifyEmailRequest;
import com.webnovel.exception.ApiException;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.repository.RefreshTokenRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.GoogleTokenVerifier;
import com.webnovel.security.GoogleTokenVerifier.GoogleUser;
import com.webnovel.security.JwtService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Register / login / refresh / logout (FR-1.1–1.4). */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final EmailVerificationService emailVerification;
    private final UserService userService;
    private final AppProperties props;

    /**
     * Manual signup (FR-1.1). Creates the account as {@code pending}; no tokens are
     * issued and login stays blocked until the code is verified via
     * {@link #verifyEmail}. The 6-digit code is <em>not</em> emailed here — it is
     * issued and sent when the client reaches the verification screen (which calls
     * {@link #resendCode}). Deferring the send to that point makes the code arrive
     * exactly when the user is ready to enter it, keeps a single page-triggered
     * send (no duplicate email, no clash with the resend cooldown), and avoids
     * emailing users who abandon signup before the verify step. (Google signups
     * skip verification entirely — see {@link #loginWithGoogle}.)
     */
    @Transactional
    public RegistrationResponse register(RegisterRequest req) {
        User existing = users.findByEmail(req.email()).orElse(null);
        if (existing != null) {
            // A verified (or Google) account owns this email — a real conflict.
            if (existing.getStatus() != UserStatus.pending) {
                throw new ConflictException("auth.email_taken");
            }
            // The email was registered but never verified: don't block the user —
            // let them resume signup. Refresh the pending account's credentials so a
            // corrected username/password takes effect, then send them to the verify
            // screen (which emails a fresh code), exactly like a first-time signup.
            if (!existing.getUsername().equals(req.username())
                    && users.existsByUsername(req.username())) {
                throw new ConflictException("auth.username_taken");
            }
            existing.setUsername(req.username());
            existing.setPasswordHash(passwordEncoder.encode(req.password()));
            users.save(existing);
            return new RegistrationResponse(existing.getEmail(), true);
        }
        if (users.existsByUsername(req.username())) {
            throw new ConflictException("auth.username_taken");
        }
        User user = new User();
        user.setUsername(req.username());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setRole(Role.reader);           // FR-1.2
        user.setStatus(UserStatus.pending);  // FR-1.2 — awaits email verification
        users.save(user);

        return new RegistrationResponse(user.getEmail(), true);
    }

    /** Verifies the emailed code, flips the account to {@code approved}, and logs in. */
    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest req) {
        User user = users.findByEmail(req.email())
                // Generic error avoids revealing which emails exist.
                .orElseThrow(() -> new BadRequestException(
                        ErrorCode.invalid_verification_code, "auth.invalid_verification_code"));
        if (user.getStatus() != UserStatus.pending) {
            throw new ConflictException(ErrorCode.already_verified, "auth.already_verified");
        }
        emailVerification.verifyAndConsume(user, req.code());
        user.setStatus(UserStatus.approved);
        users.save(user);
        return issueTokens(user);
    }

    /** Re-sends a verification code to a still-pending account (rate-limited). */
    @Transactional
    public void resendCode(ResendCodeRequest req, Locale locale) {
        User user = users.findByEmail(req.email())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, ErrorCode.not_found, "auth.user_not_found"));
        if (user.getStatus() != UserStatus.pending) {
            throw new ConflictException(ErrorCode.already_verified, "auth.already_verified");
        }
        emailVerification.assertResendAllowed(user);
        emailVerification.issueAndSend(user, locale);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = users.findByEmail(req.email())
                // Google accounts have no password hash; they must sign in via /auth/google.
                .filter(u -> u.getPasswordHash() != null
                        && passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "auth.invalid_credentials"));
        if (user.isBlocked()) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.forbidden, "auth.account_blocked");
        }
        if (user.getStatus() == UserStatus.pending) {
            // Login blocked until verified; details.email lets the frontend open the verify screen.
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.email_not_verified,
                    "auth.email_not_verified", Map.of("email", user.getEmail()));
        }
        return issueTokens(user);
    }

    /**
     * Google Sign-In (FR-1.1 alt path). Verifies the Google ID token, then applies
     * the "reject on collision" policy (no linking, no duplicate accounts):
     * <ul>
     *   <li>no account for this email → auto-create a GOOGLE reader (no registration form);</li>
     *   <li>existing GOOGLE account → sign in;</li>
     *   <li>existing LOCAL (password) account → 409, tell them to use their password.</li>
     * </ul>
     */
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest req) {
        GoogleUser google = googleTokenVerifier.verify(req.idToken());
        if (google.email() == null || !google.emailVerified()) {
            // Never trust an unverified email — it could belong to someone else.
            throw new ApiException(HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "auth.google_email_unverified");
        }
        User user = users.findByEmail(google.email()).orElse(null);
        if (user == null) {
            user = createGoogleUser(google);
        } else if (user.getAuthProvider() != AuthProvider.GOOGLE) {
            throw new ConflictException(
                    ErrorCode.email_registered_with_password, "auth.email_registered_with_password");
        }
        if (user.isBlocked()) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.forbidden, "auth.account_blocked");
        }
        return issueTokens(user);
    }

    private User createGoogleUser(GoogleUser google) {
        User user = new User();
        user.setUsername(generateUniqueUsername(google));
        user.setEmail(google.email());
        user.setPasswordHash(null);            // Google accounts never set a password
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setRole(Role.reader);             // FR-1.2 — same default as email signup
        user.setStatus(UserStatus.approved);   // FR-1.2 — Google verified the email
        return users.save(user);
    }

    /**
     * Derives a valid, unique username from the Google profile (email local-part or
     * name), sanitized to the {@code username} constraints, with a numeric suffix on
     * collision. Google never supplies a username, so the platform mints one.
     */
    private String generateUniqueUsername(GoogleUser google) {
        String source = google.email().substring(0, google.email().indexOf('@'));
        String base = source.toLowerCase().replaceAll("[^a-z0-9_]", "");
        if (base.length() < 3) {
            base = "user" + base;
        }
        if (base.length() > 40) {
            base = base.substring(0, 40); // leave room for a numeric suffix within the 50-char column
        }
        if (!users.existsByUsername(base)) {
            return base;
        }
        for (int i = 1; ; i++) {
            String candidate = base + i;
            if (!users.existsByUsername(candidate)) {
                return candidate;
            }
        }
    }

    /** Rotates the refresh token: validate stored hash → delete → issue a fresh pair (FR-1.3). */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String hash = jwtService.hashRefreshToken(rawRefreshToken);
        RefreshToken stored = refreshTokens.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "auth.invalid_refresh_token"));
        refreshTokens.delete(stored);
        if (stored.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "auth.invalid_refresh_token");
        }
        User user = users.findById(stored.getUserId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "auth.invalid_refresh_token"));
        if (user.isBlocked()) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.forbidden, "auth.account_blocked");
        }
        return issueTokens(user);
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokens.deleteByUserId(userId);
    }

    private AuthResponse issueTokens(User user) {
        String access = jwtService.generateAccessToken(user);
        String rawRefresh = jwtService.generateRefreshTokenValue();

        RefreshToken token = new RefreshToken();
        token.setUserId(user.getId());
        token.setTokenHash(jwtService.hashRefreshToken(rawRefresh));
        token.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plus(props.jwt().refreshTtl()));
        refreshTokens.save(token);

        return new AuthResponse(access, rawRefresh, userService.toResponse(user));
    }
}
