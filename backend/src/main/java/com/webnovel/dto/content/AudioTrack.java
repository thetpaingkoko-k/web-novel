package com.webnovel.dto.content;

/**
 * One track of a book's audiobook playlist (§4.1.1): a published chapter that carries
 * narration audio.
 *
 * <p>{@code locked} is {@code true} when the chapter sits behind the premium paywall for
 * this viewer — a locked track keeps its number and title so the playlist mirrors the
 * chapter list, but {@code audioUrl} is {@code null} so the audio itself never leaks.
 */
public record AudioTrack(
        Long chapterId,
        Integer chapterNumber,
        String title,
        String audioUrl,
        boolean locked) {
}
