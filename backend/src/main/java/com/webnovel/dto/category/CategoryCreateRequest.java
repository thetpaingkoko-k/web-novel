package com.webnovel.dto.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Admin creates a category. {@code code} is the permanent wire value (it lands in
 * {@code book_genres.genre} and in {@code /books?genre=} links), so it is restricted to
 * a URL- and enum-safe identifier and can never be changed afterwards.
 */
public record CategoryCreateRequest(
        @NotBlank(message = "{validation.field.required}")
        @Size(max = 30, message = "{validation.category.code_too_long}")
        @Pattern(regexp = "^[A-Za-z][A-Za-z0-9]*$", message = "{validation.category.code_format}")
        String code,

        @NotBlank(message = "{validation.field.required}")
        @Size(max = 60, message = "{validation.category.name_too_long}")
        String name,

        /** Icon name from the client's registry; null falls back to the generic glyph. */
        @Size(max = 40)
        String icon,

        Integer sortOrder) {
}
