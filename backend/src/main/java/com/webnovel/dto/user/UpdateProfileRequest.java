package com.webnovel.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Update the signed-in user's basic profile (§10.2, §4.1.1). Author fields go via /authors/me.
 * Email is intentionally NOT accepted here — it is immutable via self-service (readers cannot
 * change their email). {@code avatarUrl} is a path returned by POST /uploads/images.
 */
public record UpdateProfileRequest(
        @NotBlank(message = "{validation.username.required}")
        @Size(min = 3, max = 50, message = "{validation.username.size}") String username,
        @Size(max = 512, message = "{validation.avatar_url.size}") String avatarUrl) {
}
