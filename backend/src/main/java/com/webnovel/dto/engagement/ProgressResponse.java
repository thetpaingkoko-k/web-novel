package com.webnovel.dto.engagement;

import java.time.OffsetDateTime;

/** A reader's progress in a book; nulls when no chapter has been completed yet. */
public record ProgressResponse(
        Long bookId,
        Long lastChapterReadId,
        Integer lastChapterNumber,
        OffsetDateTime updatedAt) {
}
