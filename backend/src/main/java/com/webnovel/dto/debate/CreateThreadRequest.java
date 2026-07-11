package com.webnovel.dto.debate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Start a book discussion (FR-9.1). */
public record CreateThreadRequest(
        @NotBlank(message = "{validation.title.required}")
        @Size(max = 255, message = "{validation.title.required}") String title) {
}
