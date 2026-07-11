package com.webnovel.dto.debate;

import com.webnovel.domain.enums.VoteType;
import jakarta.validation.constraints.NotNull;

/** Cast one up/down vote on a post (FR-9.5). */
public record VoteRequest(
        @NotNull(message = "{validation.field.required}") VoteType voteType) {
}
