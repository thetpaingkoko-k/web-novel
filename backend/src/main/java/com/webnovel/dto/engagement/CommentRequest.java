package com.webnovel.dto.engagement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** New chapter comment; {@code parentCommentId} set for a threaded reply (FR-8.2). */
public record CommentRequest(
        @NotBlank(message = "{validation.content.required}")
        @Size(max = 5000, message = "{validation.field.required}") String content,
        Long parentCommentId,
        boolean spoiler) {
}
