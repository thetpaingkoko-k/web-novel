package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.Role;
import com.webnovel.exception.ConflictException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** CHANGE 1: a chapter cannot be published while the book still has another draft (FR-3.x). */
@ExtendWith(MockitoExtension.class)
class ChapterPublishServiceTest {

    @Mock ChapterRepository chapters;
    @Mock BookRepository books;
    @Mock AuthorProfileRepository authorProfiles;
    @Mock AdminActionService adminActions;
    @InjectMocks ChapterPublishService service;

    private static final long AUTHOR_ID = 50L;
    private final AppUserPrincipal author =
            new AppUserPrincipal(AUTHOR_ID, "author", Role.professional_author, false);

    private Chapter chapter(long id, ChapterStatus status) {
        Chapter c = new Chapter();
        c.setId(id);
        c.setBookId(10L);
        c.setChapterNumber(2);
        c.setStatus(status);
        return c;
    }

    private Book book() {
        Book b = new Book();
        b.setId(10L);
        b.setAuthorId(AUTHOR_ID);
        return b;
    }

    @Test
    void submit_whenBookHasAnotherDraft_isRejected() {
        Chapter target = chapter(1L, ChapterStatus.draft);
        when(chapters.findById(1L)).thenReturn(Optional.of(target));
        when(books.findById(10L)).thenReturn(Optional.of(book()));
        when(chapters.existsByBookIdAndStatusAndIdNot(10L, ChapterStatus.draft, 1L)).thenReturn(true);

        assertThatThrownBy(() -> service.submitForPublish(author, 1L, null))
                .isInstanceOf(ConflictException.class)
                .hasMessage("chapter.existing_draft");
        // the target chapter must not be advanced
        assertThat(target.getStatus()).isEqualTo(ChapterStatus.draft);
    }

    @Test
    void submit_whenNoOtherDraft_professionalPublishesDirectly() {
        Chapter target = chapter(1L, ChapterStatus.draft);
        when(chapters.findById(1L)).thenReturn(Optional.of(target));
        when(books.findById(10L)).thenReturn(Optional.of(book()));
        when(chapters.existsByBookIdAndStatusAndIdNot(10L, ChapterStatus.draft, 1L)).thenReturn(false);
        AuthorProfile profile = new AuthorProfile();
        profile.setUserId(AUTHOR_ID);
        profile.setCareerStage(CareerStage.professional);
        profile.setMonetizationEnabled(true);
        when(authorProfiles.findByUserId(AUTHOR_ID)).thenReturn(Optional.of(profile));

        var res = service.submitForPublish(author, 1L, null);

        assertThat(res.status()).isEqualTo(ChapterStatus.published);
        assertThat(target.getStatus()).isEqualTo(ChapterStatus.published);
    }
}
