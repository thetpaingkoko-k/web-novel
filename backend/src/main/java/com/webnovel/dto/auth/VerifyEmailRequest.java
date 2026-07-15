package com.webnovel.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Body of POST /auth/verify-email: the signup email + the 6-digit code from it. */
public record VerifyEmailRequest(
        @NotBlank(message = "{validation.email.required}")
        @Email(message = "{validation.email.invalid}")
        String email,

        @NotBlank(message = "{validation.code.required}")
        @Pattern(regexp = "\\d{6}", message = "{validation.code.invalid}")
        String code) {
}
