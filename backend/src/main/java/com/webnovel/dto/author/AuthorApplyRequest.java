package com.webnovel.dto.author;

import jakarta.validation.constraints.Size;

/** Bio-only author application (FR-1.2, §4.1.1). */
public record AuthorApplyRequest(
        @Size(max = 2000)
        String bio) {
}
