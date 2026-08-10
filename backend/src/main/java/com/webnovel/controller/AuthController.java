package com.webnovel.controller;

import com.webnovel.dto.auth.AuthResponse;
import com.webnovel.dto.auth.GoogleLoginRequest;
import com.webnovel.dto.auth.LoginRequest;
import com.webnovel.dto.auth.RefreshRequest;
import com.webnovel.dto.auth.RegisterRequest;
import com.webnovel.dto.auth.RegistrationResponse;
import com.webnovel.dto.auth.ResendCodeRequest;
import com.webnovel.dto.auth.VerifyEmailRequest;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Auth endpoints (PROJECT SPEC.md §10.1). */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth")
public class AuthController {

    private final AuthService authService;

    /**
     * Manual signup → account is pending. No tokens yet, and no code is sent here:
     * the verification code is emailed when the client opens the verify screen and
     * calls {@code /resend-code}.
     */
    @PostMapping("/register")
    public ResponseEntity<RegistrationResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(authService.register(req));
    }

    /** Submit the emailed code → account approved + logged in (token pair). */
    @PostMapping("/verify-email")
    public AuthResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest req) {
        return authService.verifyEmail(req);
    }

    /** Re-send a verification code to a pending account (rate-limited). */
    @PostMapping("/resend-code")
    public ResponseEntity<Void> resendCode(@Valid @RequestBody ResendCodeRequest req, Locale locale) {
        authService.resendCode(req, locale);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    /** Google Sign-In: verify the Google ID token, then create-or-login (rule B). */
    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleLoginRequest req) {
        return authService.loginWithGoogle(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req.refreshToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        authService.logout(SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }
}
