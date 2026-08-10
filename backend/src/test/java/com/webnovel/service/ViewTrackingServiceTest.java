package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.BookView;
import com.webnovel.domain.entity.ChapterView;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.BookViewRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.ChapterViewRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

/** §9.2 database-only unique-view detection. */
@ExtendWith(MockitoExtension.class)
class ViewTrackingServiceTest {

    @Mock ChapterViewRepository views;
    @Mock ChapterRepository chapters;
    @Mock BookViewRepository bookViews;
    @Mock BookRepository books;
    @InjectMocks ViewTrackingService service;

    @Test
    void firstView_isUnique_andIncrementsCounter() {
        when(chapters.existsById(5L)).thenReturn(true);
        when(views.existsRecentView(eq(5L), eq("sess"), eq("dev"), any(OffsetDateTime.class)))
                .thenReturn(false);

        boolean unique = service.record(5L, Optional.empty(), "sess", "dev");

        assertThat(unique).isTrue();
        ArgumentCaptor<ChapterView> captor = ArgumentCaptor.forClass(ChapterView.class);
        verify(views).save(captor.capture());
        assertThat(captor.getValue().isUnique()).isTrue();
        assertThat(captor.getValue().getReaderId()).isNull(); // anonymous
        verify(chapters).incrementUniqueViewCount(5L);
    }

    @Test
    void repeatViewInWindow_isNotUnique_andDoesNotIncrement() {
        when(chapters.existsById(5L)).thenReturn(true);
        when(views.existsRecentView(eq(5L), eq("sess"), eq("dev"), any(OffsetDateTime.class)))
                .thenReturn(true);

        boolean unique = service.record(5L, Optional.empty(), "sess", "dev");

        assertThat(unique).isFalse();
        ArgumentCaptor<ChapterView> captor = ArgumentCaptor.forClass(ChapterView.class);
        verify(views).save(captor.capture()); // raw view still persisted (FR-5.4)
        assertThat(captor.getValue().isUnique()).isFalse();
        verify(chapters, never()).incrementUniqueViewCount(any());
    }

    @Test
    void firstBookView_isUnique_andIncrementsBookCounter() {
        when(books.existsById(7L)).thenReturn(true);
        when(bookViews.existsRecentView(eq(7L), eq("sess"), eq("dev"), any(OffsetDateTime.class)))
                .thenReturn(false);

        boolean unique = service.recordBookView(7L, Optional.empty(), "sess", "dev");

        assertThat(unique).isTrue();
        ArgumentCaptor<BookView> captor = ArgumentCaptor.forClass(BookView.class);
        verify(bookViews).save(captor.capture());
        assertThat(captor.getValue().isUnique()).isTrue();
        verify(books).incrementViewCount(7L);
    }

    @Test
    void repeatBookViewInWindow_isNotUnique_andDoesNotIncrement() {
        when(books.existsById(7L)).thenReturn(true);
        when(bookViews.existsRecentView(eq(7L), eq("sess"), eq("dev"), any(OffsetDateTime.class)))
                .thenReturn(true);

        boolean unique = service.recordBookView(7L, Optional.empty(), "sess", "dev");

        assertThat(unique).isFalse();
        verify(bookViews).save(any(BookView.class)); // raw view still persisted (FR-5.4)
        verify(books, never()).incrementViewCount(any());
    }
}
