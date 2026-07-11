package com.webnovel.dto.admin;

import jakarta.validation.constraints.NotNull;

/** Suspend or ban a user (§4.1.1): {@code false} suspends, {@code true} bans (FR-1.4). */
public record SuspendRequest(
        @NotNull(message = "{validation.field.required}") Boolean ban) {
}
