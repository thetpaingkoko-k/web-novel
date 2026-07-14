package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.Genre;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BookUpdateRequest(
        @NotBlank(message = "{validation.title.required}")
        @Size(max = 255)
        String title,

        String synopsis,

        List<Genre> genres,

        @Size(max = 500)
        String coverImageUrl,

        BookStatus status,

        boolean isPremium) {
}
