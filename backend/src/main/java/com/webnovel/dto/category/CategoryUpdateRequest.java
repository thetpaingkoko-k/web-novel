package com.webnovel.dto.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Admin edits a category. The {@code code} is immutable (books reference it), so only the
 * display label, the icon, the picker ordering, and the active flag can change.
 */
public record CategoryUpdateRequest(
        @NotBlank(message = "{validation.field.required}")
        @Size(max = 60, message = "{validation.category.name_too_long}")
        String name,

        /** Icon name from the client's registry; null falls back to the generic glyph. */
        @Size(max = 40)
        String icon,

        boolean active,

        Integer sortOrder) {
}
