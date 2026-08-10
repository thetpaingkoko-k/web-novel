package com.webnovel.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Suspend or ban a user (§4.1.1): {@code ban=false} suspends, {@code ban=true} bans (FR-1.4).
 * {@code reason} is required and captured on the account; the user sees it on a blocked login.
 */
public record SuspendRequest(
        @NotNull(message = "{validation.field.required}") Boolean ban,
        @NotBlank(message = "{validation.field.required}")
        @Size(max = 500, message = "{validation.reason.size}") String reason) {
}
