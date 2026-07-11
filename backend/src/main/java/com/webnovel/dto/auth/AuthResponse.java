package com.webnovel.dto.auth;

import com.webnovel.dto.user.UserResponse;

/** Issued on register/login/refresh: token pair + the current user (matches the frontend contract). */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        UserResponse user) {
}
