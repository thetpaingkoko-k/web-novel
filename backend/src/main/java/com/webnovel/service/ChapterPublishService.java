package com.webnovel.service;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.dto.content.AdminChapterRow;
import com.webnovel.dto.content.ChapterResponse;
import com.webnovel.dto.content.PublishRequest;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.security.AppUserPrincipal;
import com.webnovel.security.SecurityUtils;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chapter publishing + hobbyist review (§9.5, FR-3.x). Audited to ADMIN_ACTION. */
@Service
@RequiredArgsConstructor
public class ChapterPublishService {

    private final ChapterRepository chapters;
    private final BookRepository books;
    private final AuthorProfileRepository authorProfiles;
    private final AdminActionService adminActions;
    private final NotificationService notifications;

    /** Author submits a chapter: professionals publish/schedule directly, hobbyists enter review (§9.5). */
    @Transactional
    public ChapterResponse submitForPublish(AppUserPrincipal principal, Long chapterId, PublishRequest req) {
        Chapter chapter = chapters.findById(chapterId)
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        Book book = books.findById(chapter.getBookId())
                .orElseThrow(() -> new NotFoundException("book.not_found"));
        if (!principal.isAdmin() && !book.getAuthorId().equals(principal.getId())) {
            throw new ForbiddenException("content.not_author");
        }

        // A book must never carry an orphaned draft while another chapter is being published:
        // the author revises by deleting the existing draft first (FR-3.x). Reject if any OTHER
        // chapter of this book is still in draft.
        if (chapters.existsByBookIdAndStatusAndIdNot(book.getId(), ChapterStatus.draft, chapter.getId())) {
            throw new ConflictException(ErrorCode.existing_draft, "chapter.existing_draft");
        }

        boolean professional = authorProfiles.findByUserId(book.getAuthorId())
                .map(p -> p.getCareerStage() == CareerStage.professional && p.isMonetizationEnabled())
                .orElse(false);
        OffsetDateTime scheduledFor = req == null ? null : req.scheduledFor();

        if (professional) {
            if (scheduledFor != null && scheduledFor.isAfter(OffsetDateTime.now())) {
                chapter.setStatus(ChapterStatus.scheduled);
                chapter.setPublishedAt(scheduledFor);
            } else {
                chapter.setStatus(ChapterStatus.published);
                chapter.setPublishedAt(OffsetDateTime.now());
            }
        } else {
            chapter.setStatus(ChapterStatus.pending_review); // FR-3.1
            chapter.setPublishedAt(scheduledFor); // tentative; finalized on approval
        }
        return ChapterService.toResponse(chapter);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminChapterRow> reviewQueue() {
        return chapters.findQueueByStatus(ChapterStatus.pending_review);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ChapterResponse approve(Long chapterId) {
        Chapter chapter = requirePendingReview(chapterId);
        OffsetDateTime scheduledFor = chapter.getPublishedAt();
        if (scheduledFor != null && scheduledFor.isAfter(OffsetDateTime.now())) {
            chapter.setStatus(ChapterStatus.scheduled);
        } else {
            chapter.setStatus(ChapterStatus.published);
            chapter.setPublishedAt(OffsetDateTime.now());
        }
        chapter.setReviewedBy(SecurityUtils.currentUserId());
        chapter.setReviewedAt(OffsetDateTime.now());
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.content_approval,
                "chapter", chapterId, null);
        notifyBookAuthor(chapter, NotificationType.chapter_approved);
        return ChapterService.toResponse(chapter);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ChapterResponse reject(Long chapterId, String reason) {
        Chapter chapter = requirePendingReview(chapterId);
        chapter.setStatus(ChapterStatus.rejected);
        chapter.setRejectionReason(reason);
        chapter.setReviewedBy(SecurityUtils.currentUserId());
        chapter.setReviewedAt(OffsetDateTime.now());
        adminActions.log(SecurityUtils.currentUserId(), AdminActionType.content_rejection,
                "chapter", chapterId, reason);
        notifyBookAuthor(chapter, NotificationType.chapter_rejected);
        return ChapterService.toResponse(chapter);
    }

    /** Notifies the chapter's book author of an approval/rejection; {@code data} is the book title. */
    private void notifyBookAuthor(Chapter chapter, NotificationType type) {
        Book book = books.findById(chapter.getBookId()).orElse(null);
        if (book == null) {
            return;
        }
        notifications.notify(book.getAuthorId(), type, "chapter", chapter.getId(), book.getTitle());
    }

    private Chapter requirePendingReview(Long chapterId) {
        Chapter chapter = chapters.findById(chapterId)
                .orElseThrow(() -> new NotFoundException("chapter.not_found"));
        if (chapter.getStatus() != ChapterStatus.pending_review) {
            throw new BadRequestException("error.conflict");
        }
        return chapter;
    }
}
