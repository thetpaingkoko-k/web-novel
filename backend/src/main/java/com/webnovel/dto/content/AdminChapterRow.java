package com.webnovel.dto.content;

import com.webnovel.domain.enums.ChapterStatus;

/** Admin review-queue row: chapter plus joined book title and author username (§4.1.1). */
public record AdminChapterRow(
        Long chapterId,
        Long bookId,
        String bookTitle,
        String authorUsername,
        Integer chapterNumber,
        String title,
        ChapterStatus status) {
}
