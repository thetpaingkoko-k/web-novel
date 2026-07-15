package com.webnovel.service;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.entity.ChapterComment;
import com.webnovel.domain.entity.ChapterLike;
import com.webnovel.domain.entity.ReadingProgress;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.CommentStatus;
import com.webnovel.dto.engagement.CommentRequest;
import com.webnovel.dto.engagement.CommentResponse;
import com.webnovel.dto.engagement.LikeResponse;
import com.webnovel.dto.engagement.ProgressResponse;
import com.webnovel.dto.engagement.ProgressUpdateRequest;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterCommentRepository;
import com.webnovel.repository.ChapterLikeRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.ChapterViewRepository;
import com.webnovel.repository.ReadingProgressRepository;
import com.webnovel.security.AppUserPrincipal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chapter likes, spoiler-safe threaded comments, and reading progress (FR-8, FR-10). */
@Service
@RequiredArgsConstructor
public class EngagementService {

    private final ChapterRepository chapters;
    private final ChapterLikeRepository likes;
    private final ChapterCommentRepository comments;
    private final ChapterViewRepository views;
    private final ReadingProgressRepository progress;
    private final BookRepository books;
    private final AdminActionService adminActions;

    // --- likes (FR-8.1, once each; like_count denormalized) ---

    @Transactional
    public LikeResponse like(AppUserPrincipal reader, Long chapterId) {
        Chapter chapter = requireChapter(chapterId);
        if (!likes.existsByChapterIdAndReaderId(chapterId, reader.getId())) {
            ChapterLike like = new ChapterLike();
            like.setChapterId(chapterId);
            like.setReaderId(reader.getId());
            likes.save(like);
            chapters.addLikeCount(chapterId, 1);
            return new LikeResponse(chapter.getLikeCount() + 1, true);
        }
        return new LikeResponse(chapter.getLikeCount(), true);
    }

    @Transactional
    public LikeResponse unlike(AppUserPrincipal reader, Long chapterId) {
        Chapter chapter = requireChapter(chapterId);
        long removed = likes.deleteByChapterIdAndReaderId(chapterId, reader.getId());
        if (removed > 0) {
            chapters.addLikeCount(chapterId, -1);
            return new LikeResponse(chapter.getLikeCount() - 1, false);
        }
        return new LikeResponse(chapter.getLikeCount(), false);
    }

    // --- comments (FR-8.2 threaded, FR-8.3 spoiler-safe) ---

    @Transactional
    public CommentResponse addComment(AppUserPrincipal reader, Long chapterId, CommentRequest req) {
        requireChapter(chapterId);
        // FR-8.2: you may only discuss a chapter you have actually read. Subscription is not
        // required — only a recorded view of this chapter. Admins and the book's author bypass.
        if (!reader.isAdmin() && !views.existsByChapterIdAndReaderId(chapterId, reader.getId())) {
            throw new ForbiddenException("comment.must_read_first");
        }
        if (req.parentCommentId() != null
                && !comments.existsByIdAndChapterId(req.parentCommentId(), chapterId)) {
            throw new NotFoundException("comment.parent_not_found");
        }
        ChapterComment comment = new ChapterComment();
        comment.setChapterId(chapterId);
        comment.setReaderId(reader.getId());
        comment.setParentCommentId(req.parentCommentId());
        comment.setContent(req.content());
        comment.setSpoilerFlagged(req.spoiler());
        comment.setStatus(CommentStatus.visible);
        comment.setCreatedAt(OffsetDateTime.now());
        comments.save(comment);
        return new CommentResponse(comment.getId(), chapterId, comment.getParentCommentId(),
                reader.getId(), reader.getUsername(), comment.getContent(),
                comment.isSpoilerFlagged(), comment.getStatus(), comment.getCreatedAt());
    }

    /**
     * Spoiler-safe listing (FR-8.3): a chapter's comments are shown only to a reader
     * whose reading progress in that book has reached this chapter — enforced here, never
     * on the client (§4.1.1). The book's author and admins bypass the gate.
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(Long chapterId, Optional<AppUserPrincipal> viewer) {
        Chapter chapter = requireChapter(chapterId);
        boolean privileged = viewer
                .map(v -> v.isAdmin() || isBookAuthor(chapter.getBookId(), v.getId()))
                .orElse(false);
        if (!privileged) {
            Integer lastRead = viewer
                    .flatMap(v -> progress.findLastReadChapterNumber(v.getId(), chapter.getBookId()))
                    .orElse(null);
            if (lastRead == null || lastRead < chapter.getChapterNumber()) {
                return List.of();
            }
            return comments.findThreadByChapter(chapterId);
        }
        // Admins and the book's author also see moderator-hidden comments (FR-13.6).
        return comments.findThreadByChapterIncludingHidden(chapterId);
    }

    /**
     * Soft-deletes the caller's own comment (sets {@link CommentStatus#removed}) so reply
     * threads stay intact — {@link #listComments} still returns the node. 403 if the caller
     * is not the comment's author, 404 if it does not exist.
     */
    @Transactional
    public void deleteComment(AppUserPrincipal reader, Long commentId) {
        ChapterComment comment = comments.findById(commentId)
                .orElseThrow(() -> new NotFoundException("comment.not_found"));
        if (!comment.getReaderId().equals(reader.getId())) {
            throw new ForbiddenException("comment.not_author");
        }
        comment.setStatus(CommentStatus.removed);
        comments.save(comment);
    }

    /**
     * Admin moderation: hides ({@link CommentStatus#hidden}) or restores
     * ({@link CommentStatus#visible}) a comment and writes an audit entry (§7.3, FR-13.6).
     * Hidden comments are dropped from the non-privileged reader thread listing, but
     * remain visible to admins and the book's author (FR-13.6).
     * 404 if the comment does not exist.
     */
    @Transactional
    public CommentResponse setCommentHidden(Long adminId, Long commentId, boolean hidden) {
        ChapterComment comment = comments.findById(commentId)
                .orElseThrow(() -> new NotFoundException("comment.not_found"));
        comment.setStatus(hidden ? CommentStatus.hidden : CommentStatus.visible);
        comments.save(comment);
        adminActions.log(adminId,
                hidden ? AdminActionType.content_removal : AdminActionType.content_approval,
                "chapter_comment", commentId, hidden ? "Comment hidden" : "Comment unhidden");
        return comments.findCommentView(commentId).orElseThrow();
    }

    // --- reading progress (FR-10) ---

    @Transactional
    public ProgressResponse updateProgress(AppUserPrincipal reader, Long bookId, ProgressUpdateRequest req) {
        Chapter chapter = chapters.findById(req.chapterId())
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        if (!chapter.getBookId().equals(bookId)) {
            throw new BadRequestException("progress.chapter_not_in_book");
        }
        ReadingProgress record = progress.findByReaderIdAndBookId(reader.getId(), bookId)
                .orElseGet(() -> {
                    ReadingProgress p = new ReadingProgress();
                    p.setReaderId(reader.getId());
                    p.setBookId(bookId);
                    return p;
                });
        Integer currentNumber = record.getLastChapterReadId() == null ? null
                : chapters.findById(record.getLastChapterReadId())
                        .map(Chapter::getChapterNumber).orElse(null);
        boolean advances = currentNumber == null || chapter.getChapterNumber() > currentNumber;
        if (advances) {
            record.setLastChapterReadId(chapter.getId());
        }
        record.setUpdatedAt(OffsetDateTime.now());
        progress.save(record);
        if (advances) {
            chapters.incrementCompletionCount(chapter.getId()); // FR-5.5 completion
        }
        return toResponse(bookId, record, chapter.getChapterNumber());
    }

    @Transactional(readOnly = true)
    public ProgressResponse getProgress(AppUserPrincipal reader, Long bookId) {
        return progress.findByReaderIdAndBookId(reader.getId(), bookId)
                .map(p -> {
                    Integer number = p.getLastChapterReadId() == null ? null
                            : chapters.findById(p.getLastChapterReadId())
                                    .map(Chapter::getChapterNumber).orElse(null);
                    return toResponse(bookId, p, number);
                })
                .orElse(new ProgressResponse(bookId, null, null, null));
    }

    private static ProgressResponse toResponse(Long bookId, ReadingProgress p, Integer number) {
        return new ProgressResponse(bookId, p.getLastChapterReadId(), number, p.getUpdatedAt());
    }

    private Chapter requireChapter(Long chapterId) {
        return chapters.findById(chapterId).orElseThrow(() -> new NotFoundException("chapter.not_found"));
    }

    private boolean isBookAuthor(Long bookId, Long userId) {
        return books.findById(bookId).map(Book::getAuthorId).map(userId::equals).orElse(false);
    }
}
