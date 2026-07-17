package com.webnovel.dto.content;

import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.Genre;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Update a book. The title is immutable after creation and is intentionally NOT accepted here. */
public record BookUpdateRequest(
        String synopsis,

        List<Genre> genres,

        @Size(max = 500)
        String coverImageUrl,

        BookStatus status,

        boolean isPremium) {
}
