package com.webnovel.dto.engagement;

import jakarta.validation.constraints.NotNull;

/** Reported on chapter completion, not on open (§4.1.1, FR-10.1). */
public record ProgressUpdateRequest(
        @NotNull(message = "{validation.field.required}") Long chapterId) {
}
