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
    private final AccessControlService accessControl;

    @Transactional
    public ChapterResponse create(AppUserPrincipal principal, Long bookId, ChapterCreateRequest req) {
        Book book = requireOwnedBook(principal, bookId);
        if (chapters.existsByBookIdAndChapterNumber(book.getId(), req.chapterNumber())) {
            throw new ConflictException("chapter.number_taken");
        }
        Chapter chapter = new Chapter();
        chapter.setBookId(book.getId());
        chapter.setChapterNumber(req.chapterNumber());
        chapter.setTitle(req.title());
        chapter.setContent(req.content());
        chapter.setStatus(ChapterStatus.draft);
        chapters.save(chapter);
        return toResponse(chapter);
    }

    @Transactional
    public ChapterResponse update(AppUserPrincipal principal, Long chapterId, ChapterUpdateRequest req) {
        Chapter chapter = chapters.findById(chapterId)
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        requireOwnedBook(principal, chapter.getBookId());
        chapter.setTitle(req.title());
        chapter.setContent(req.content());
        return toResponse(chapter);
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
        if (chapter.getStatus() == ChapterStatus.published) {
            accessControl.assertCanAccess(viewer, book); // premium gating (owner/admin bypass inside)
        }
        return toResponse(chapter);
    }

    Book requireOwnedBook(AppUserPrincipal principal, Long bookId) {
        Book book = books.findById(bookId).orElseThrow(() -> new NotFoundException("book.not_found"));
        if (!principal.isAdmin() && !book.getAuthorId().equals(principal.getId())) {
            throw new ForbiddenException("content.not_author");
        }
        return book;
    }

    public static ChapterResponse toResponse(Chapter c) {
        return new ChapterResponse(
                c.getId(), c.getBookId(), c.getChapterNumber(), c.getTitle(), c.getContent(),
                c.getStatus(), c.getLikeCount(), c.getUniqueViewCount(), c.getCompletionCount(),
                c.getRejectionReason(), c.getPublishedAt());
    }
}
