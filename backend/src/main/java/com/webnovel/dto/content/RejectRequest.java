package com.webnovel.dto.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin rejection with a required reason (FR-3.3). */
public record RejectRequest(
        @NotBlank(message = "{validation.field.required}")
        @Size(max = 1000)
        String reason) {
}
