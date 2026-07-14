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
import com.webnovel.exception.ApiException;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.repository.RefreshTokenRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.GoogleTokenVerifier;
import com.webnovel.security.GoogleTokenVerifier.GoogleUser;
import com.webnovel.security.JwtService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
    private final UserService userService;
    private final AppProperties props;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (users.existsByEmail(req.email())) {
            throw new ConflictException("auth.email_taken");
        }
        if (users.existsByUsername(req.username())) {
            throw new ConflictException("auth.username_taken");
        }
        User user = new User();
        user.setUsername(req.username());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setRole(Role.reader);          // FR-1.2
        user.setStatus(UserStatus.approved); // FR-1.2
        users.save(user);
        return issueTokens(user);
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
