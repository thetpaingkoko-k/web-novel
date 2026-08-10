package com.webnovel.dto.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Upload a chapter incrementally (FR-2.5). Created as a draft. */
public record ChapterCreateRequest(
        // Optional: when omitted the chapter is auto-numbered as the next in the book.
        @Positive
        Integer chapterNumber,

        @NotBlank(message = "{validation.title.required}")
        @Size(max = 255)
        String title,

        @NotBlank(message = "{validation.content.required}")
        String content,

        // Optional narration audio URL (audiobook). Null when the author adds no audio.
        @Size(max = 1024)
        String audioUrl) {
}
