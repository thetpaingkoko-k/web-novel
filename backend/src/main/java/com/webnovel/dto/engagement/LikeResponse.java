package com.webnovel.dto.engagement;

/** Denormalized like count plus this reader's current like state (FR-8.1). */
public record LikeResponse(int likeCount, boolean liked) {
}
