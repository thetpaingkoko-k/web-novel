package com.webnovel.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "{validation.field.required}")
        String refreshToken) {
}
