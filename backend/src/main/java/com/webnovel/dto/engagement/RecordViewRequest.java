package com.webnovel.dto.engagement;

import jakarta.validation.constraints.NotBlank;

/** Client-supplied view signals for DB-only dedup (§4.1.1, FR-5.1). */
public record RecordViewRequest(
        @NotBlank(message = "{validation.field.required}") String sessionId,
        String deviceFingerprint) {
}
