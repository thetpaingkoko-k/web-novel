package com.webnovel.dto.feed;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Publish an author feed post, optionally premium-only (FR-11.1). */
public record FeedPostRequest(
        @NotBlank(message = "{validation.title.required}")
        @Size(max = 255, message = "{validation.title.required}") String title,
        @NotBlank(message = "{validation.content.required}") String content,
        boolean premiumOnly) {
}
