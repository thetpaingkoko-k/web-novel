package com.webnovel.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** Body of POST /api/v1/auth/google: the ID token ("credential") from Google Identity Services. */
public record GoogleLoginRequest(
        @NotBlank(message = "{validation.google_token.required}")
        String idToken) {
}
