package com.webnovel.service;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.dto.content.ChapterCreateRequest;
import com.webnovel.dto.content.ChapterResponse;
import com.webnovel.dto.content.ChapterUpdateRequest;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterLikeRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chapter upload/edit + access-controlled read (FR-2.5, FR-3.4, FR-4.x). */
@Service
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapters;
    private final BookRepository books;
    private final ChapterLikeRepository chapterLikes;
    private final AccessControlService accessControl;

    @Transactional
    public ChapterResponse create(AppUserPrincipal principal, Long bookId, ChapterCreateRequest req) {
        Book book = requireOwnedBook(principal, bookId);
        // Auto-number as the next chapter unless the author explicitly pins one.
        int chapterNumber;
        if (req.chapterNumber() == null) {
            chapterNumber = chapters.findMaxChapterNumber(book.getId()) + 1;
        } else {
            if (chapters.existsByBookIdAndChapterNumber(book.getId(), req.chapterNumber())) {
                throw new ConflictException("chapter.number_taken");
            }
            chapterNumber = req.chapterNumber();
        }
        Chapter chapter = new Chapter();
        chapter.setBookId(book.getId());
        chapter.setChapterNumber(chapterNumber);
        chapter.setTitle(req.title());
        chapter.setContent(req.content());
        chapter.setStatus(ChapterStatus.draft);
        chapters.save(chapter);
        return toResponse(chapter);
    }

    /**
     * Edit a chapter's title/content. Authors may no longer modify written content —
     * only admins can (to correct/moderate). Authors revise a draft by deleting and
     * re-adding it.
     */
    @Transactional
    public ChapterResponse update(AppUserPrincipal principal, Long chapterId, ChapterUpdateRequest req) {
        if (!principal.isAdmin()) {
            throw new ForbiddenException("content.edit_admin_only");
        }
        Chapter chapter = chapters.findById(chapterId)
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        chapter.setTitle(req.title());
        chapter.setContent(req.content());
        return toResponse(chapter);
    }

    /**
     * Delete a chapter. Authors may delete only their own {@code draft} chapters
     * (to discard/redo before publishing); admins may delete any chapter, published
     * or not (child views/likes/comments cascade at the DB level).
     */
    @Transactional
    public void delete(AppUserPrincipal principal, Long chapterId) {
        Chapter chapter = chapters.findById(chapterId)
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        if (principal.isAdmin()) {
            chapters.delete(chapter);
            return;
        }
        requireOwnedBook(principal, chapter.getBookId());
        // Authors may discard chapters that were never (or are no longer) live: their
        // own drafts and rejected chapters. Published/scheduled/pending stay admin-only.
        if (chapter.getStatus() != ChapterStatus.draft && chapter.getStatus() != ChapterStatus.rejected) {
            throw new ForbiddenException("chapter.delete_draft_only");
        }
        chapters.delete(chapter);
    }

    /** Access-controlled read (§9.1). Unpublished chapters are visible only to the author/admin. */
    @Transactional(readOnly = true)
    public ChapterResponse getForReader(Long chapterId, Optional<AppUserPrincipal> viewer) {
        Chapter chapter = chapters.findById(chapterId)
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        Book book = books.findById(chapter.getBookId())
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        boolean privileged = viewer
                .map(v -> v.isAdmin() || book.getAuthorId().equals(v.getId()))
                .orElse(false);
        if (chapter.getStatus() != ChapterStatus.published && !privileged) {
            throw new NotFoundException("chapter.not_found"); // don't leak unpublished chapters
        }
        // First 10% of a premium book's published chapters are a free preview (owner/admin/preview
        // all bypass the subscription gate).
        boolean preview = accessControl.isFreePreview(book, chapter);
        if (chapter.getStatus() == ChapterStatus.published) {
            accessControl.assertCanAccessChapter(viewer, book, chapter);
        }
        boolean likedByMe = viewer
                .map(v -> chapterLikes.existsByChapterIdAndReaderId(chapterId, v.getId()))
                .orElse(false);
        // Readers see a gapless sequence: a rejected/removed chapter must not leave a hole,
        // so a published chapter is numbered by its position among published chapters, not by
        // its stored number. Author/admin keep the true stored number to manage drafts.
        int displayNumber = privileged
                ? chapter.getChapterNumber()
                : (int) chapters.countByBookIdAndStatusAndChapterNumberLessThanEqual(
                        book.getId(), ChapterStatus.published, chapter.getChapterNumber());
        return toResponse(chapter, likedByMe, preview, displayNumber);
    }

    Book requireOwnedBook(AppUserPrincipal principal, Long bookId) {
        Book book = books.findById(bookId).orElseThrow(() -> new NotFoundException("book.not_found"));
        if (!principal.isAdmin() && !book.getAuthorId().equals(principal.getId())) {
            throw new ForbiddenException("content.not_author");
        }
        return book;
    }

    /**
     * Authoring/review paths don't resolve the viewer's like or preview eligibility;
     * {@code likedByMe} and {@code preview} are {@code false}.
     */
    public static ChapterResponse toResponse(Chapter c) {
        return toResponse(c, false, false);
    }

    public static ChapterResponse toResponse(Chapter c, boolean likedByMe, boolean preview) {
        return toResponse(c, likedByMe, preview, c.getChapterNumber());
    }

    /** As {@link #toResponse(Chapter, boolean, boolean)} but with an explicit display number
     *  (the reader-facing gapless sequence differs from the stored number). */
    public static ChapterResponse toResponse(Chapter c, boolean likedByMe, boolean preview, int displayNumber) {
        return new ChapterResponse(
                c.getId(), c.getBookId(), displayNumber, c.getTitle(), c.getContent(),
                c.getStatus(), c.getLikeCount(), c.getUniqueViewCount(), c.getCompletionCount(),
                c.getRejectionReason(), c.getPublishedAt(), likedByMe, preview);
    }
}
