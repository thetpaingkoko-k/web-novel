package com.webnovel.dto.debate;

import com.webnovel.domain.enums.ThreadStatus;
import jakarta.validation.constraints.NotNull;

/** Lock or reopen a thread — one endpoint covers both (§4.1.1, FR-9.6). */
public record LockRequest(
        @NotNull(message = "{validation.field.required}") ThreadStatus status) {
}
