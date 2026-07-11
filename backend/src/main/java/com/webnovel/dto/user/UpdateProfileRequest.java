package com.webnovel.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Update the signed-in user's basic profile (§10.2, §4.1.1). Author fields go via /authors/me. */
public record UpdateProfileRequest(
        @NotBlank(message = "{validation.username.required}")
        @Size(min = 3, max = 50, message = "{validation.username.size}") String username,
        @NotBlank(message = "{validation.email.required}")
        @Email(message = "{validation.email.invalid}") String email) {
}
