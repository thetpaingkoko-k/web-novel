package com.webnovel.dto.author;

import jakarta.validation.constraints.Size;

/** Become-an-author application (FR-1.2, §4.1.1): bio + writing motivation/interests. */
public record AuthorApplyRequest(
        @Size(max = 2000)
        String bio,

        @Size(max = 2000)
        String writingMotivation,

        @Size(max = 2000)
        String writingInterests) {
}
