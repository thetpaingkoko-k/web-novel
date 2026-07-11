package com.webnovel.dto.debate;

import jakarta.validation.constraints.NotBlank;

/** Post or reply within a thread; {@code parentPostId} set for a reply (FR-9.4). */
public record CreatePostRequest(
        @NotBlank(message = "{validation.content.required}") String content,
        Long parentPostId) {
}
