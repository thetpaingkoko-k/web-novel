package com.webnovel.dto.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Edit a chapter (also used to resubmit a rejected one, FR-3.4). */
public record ChapterUpdateRequest(
        @NotBlank(message = "{validation.title.required}")
        @Size(max = 255)
        String title,

        @NotBlank(message = "{validation.content.required}")
        String content) {
}
