package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create a book directly (FR-2.1). {@code isPremium} is honored only for monetized professionals (FR-2.4). */
public record BookCreateRequest(
        @NotBlank(message = "{validation.title.required}")
        @Size(max = 255)
        String title,

        String synopsis,

        @Size(max = 50)
        String genre,

        @Size(max = 500)
        String coverImageUrl,

        BookStatus status,

        boolean isPremium) {
}
