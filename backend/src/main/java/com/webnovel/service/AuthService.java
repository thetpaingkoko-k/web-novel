package com.webnovel.service;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.RefreshToken;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.auth.AuthResponse;
import com.webnovel.dto.auth.LoginRequest;
import com.webnovel.dto.auth.RegisterRequest;
import com.webnovel.exception.ApiException;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.repository.RefreshTokenRepository;
import com.webnovel.repository.UserRepository;
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
        user.setRole(Role.reader);          // FR-1.2
        user.setStatus(UserStatus.approved); // FR-1.2
        users.save(user);
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = users.findByEmail(req.email())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "auth.invalid_credentials"));
        if (user.isBlocked()) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.forbidden, "auth.account_blocked");
        }
        return issueTokens(user);
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
