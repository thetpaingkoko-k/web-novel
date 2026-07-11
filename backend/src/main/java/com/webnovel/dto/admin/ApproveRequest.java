package com.webnovel.dto.admin;

import jakarta.validation.constraints.NotNull;

/** Single approve endpoint discriminated by {@code kind} (§4.1.1). */
public record ApproveRequest(
        @NotNull
        Kind kind) {

    public enum Kind { verify_author, enable_monetization }
}
