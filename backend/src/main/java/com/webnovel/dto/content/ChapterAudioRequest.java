package com.webnovel.dto.content;

import jakarta.validation.constraints.Size;

/**
 * Set (or clear) a chapter's narration audio (audiobook feature). A {@code null}
 * {@code audioUrl} removes the audio; otherwise it points at an uploaded file.
 * Allowed for the owning author regardless of chapter status — including after
 * the chapter is published.
 */
public record ChapterAudioRequest(
        @Size(max = 1024)
        String audioUrl) {
}
