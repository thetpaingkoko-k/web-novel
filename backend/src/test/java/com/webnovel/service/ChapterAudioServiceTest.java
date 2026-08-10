package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.Role;
import com.webnovel.dto.content.ChapterAudioRequest;
import com.webnovel.dto.content.ChapterResponse;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterLikeRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** ChapterService.setAudio: owner may attach/replace/clear narration audio in any status (audiobook). */
@ExtendWith(MockitoExtension.class)
class ChapterAudioServiceTest {

    @Mock ChapterRepository chapters;
    @Mock BookRepository books;
    @Mock ChapterLikeRepository chapterLikes;
    @Mock AccessControlService accessControl;
    @InjectMocks ChapterService service;

    private static final long AUTHOR_ID = 50L;
    private final AppUserPrincipal author =
            new AppUserPrincipal(AUTHOR_ID, "author", Role.professional_author, false);
    private final AppUserPrincipal stranger =
            new AppUserPrincipal(99L, "stranger", Role.professional_author, false);

    private Chapter publishedChapter() {
        Chapter c = new Chapter();
        c.setId(1L);
        c.setBookId(10L);
        c.setChapterNumber(2);
        c.setStatus(ChapterStatus.published);
        return c;
    }

    private Book book() {
        Book b = new Book();
        b.setId(10L);
        b.setAuthorId(AUTHOR_ID);
        return b;
    }

    @Test
    void setAudio_ownerOnPublishedChapter_setsUrl() {
        Chapter target = publishedChapter();
        when(chapters.findById(1L)).thenReturn(Optional.of(target));
        when(books.findById(10L)).thenReturn(Optional.of(book()));

        ChapterResponse res =
                service.setAudio(author, 1L, new ChapterAudioRequest("/uploads/audio/x.mp3"));

        assertThat(res.audioUrl()).isEqualTo("/uploads/audio/x.mp3");
        assertThat(target.getAudioUrl()).isEqualTo("/uploads/audio/x.mp3");
    }

    @Test
    void setAudio_nullUrl_clearsAudio() {
        Chapter target = publishedChapter();
        target.setAudioUrl("/uploads/audio/old.mp3");
        when(chapters.findById(1L)).thenReturn(Optional.of(target));
        when(books.findById(10L)).thenReturn(Optional.of(book()));

        ChapterResponse res = service.setAudio(author, 1L, new ChapterAudioRequest(null));

        assertThat(res.audioUrl()).isNull();
        assertThat(target.getAudioUrl()).isNull();
    }

    @Test
    void setAudio_nonOwner_isForbidden() {
        Chapter target = publishedChapter();
        when(chapters.findById(1L)).thenReturn(Optional.of(target));
        when(books.findById(10L)).thenReturn(Optional.of(book()));

        assertThatThrownBy(
                        () -> service.setAudio(stranger, 1L, new ChapterAudioRequest("/uploads/audio/x.mp3")))
                .isInstanceOf(ForbiddenException.class);
        assertThat(target.getAudioUrl()).isNull();
    }
}
