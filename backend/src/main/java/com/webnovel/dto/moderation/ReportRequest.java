package com.webnovel.dto.moderation;

import com.webnovel.domain.enums.ReportTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** File a report against a comment, debate post, book, or user (FR-12.1). */
public record ReportRequest(
        @NotNull(message = "{validation.field.required}") ReportTargetType targetType,
        @NotNull(message = "{validation.field.required}") Long targetId,
        @NotBlank(message = "{validation.field.required}")
        @Size(max = 500, message = "{validation.field.required}") String reason) {
}
