package com.webnovel.dto.engagement;

/** Result of recording a view: whether it counted as unique (§9.2). */
public record ViewResponse(boolean unique) {
}
