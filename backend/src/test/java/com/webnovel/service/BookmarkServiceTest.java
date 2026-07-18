package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.Bookmark;
import com.webnovel.domain.enums.Role;
import com.webnovel.dto.content.BookListItem;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.BookmarkRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Saved books / "My List" (§4.1.1): idempotent add/remove, 404 on missing book. */
@ExtendWith(MockitoExtension.class)
class BookmarkServiceTest {

    @Mock BookmarkRepository bookmarks;
    @Mock BookRepository books;
    @InjectMocks BookmarkService service;

    private final AppUserPrincipal reader = new AppUserPrincipal(7L, "reader", Role.reader, false);

    @Test
    void add_firstTime_savesBookmark() {
        when(books.existsById(3L)).thenReturn(true);
        when(bookmarks.existsByReaderIdAndBookId(7L, 3L)).thenReturn(false);

        service.add(reader, 3L);

        ArgumentCaptor<Bookmark> captor = ArgumentCaptor.forClass(Bookmark.class);
        verify(bookmarks).save(captor.capture());
        assertThat(captor.getValue().getReaderId()).isEqualTo(7L);
        assertThat(captor.getValue().getBookId()).isEqualTo(3L);
    }

    @Test
    void add_alreadyBookmarked_isIdempotentNoop() {
        when(books.existsById(3L)).thenReturn(true);
        when(bookmarks.existsByReaderIdAndBookId(7L, 3L)).thenReturn(true);

        service.add(reader, 3L);

        verify(bookmarks, never()).save(any());
    }

    @Test
    void add_missingBook_throwsNotFound() {
        when(books.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.add(reader, 99L))
                .isInstanceOf(NotFoundException.class);
        verify(bookmarks, never()).save(any());
    }

    @Test
    void remove_deletesByReaderAndBook() {
        when(books.existsById(3L)).thenReturn(true);
        when(bookmarks.deleteByReaderIdAndBookId(7L, 3L)).thenReturn(1L);

        service.remove(reader, 3L);

        verify(bookmarks).deleteByReaderIdAndBookId(7L, 3L);
    }

    @Test
    void remove_notBookmarked_isIdempotentNoop() {
        when(books.existsById(3L)).thenReturn(true);
        when(bookmarks.deleteByReaderIdAndBookId(7L, 3L)).thenReturn(0L);

        service.remove(reader, 3L); // no exception
    }

    @Test
    void remove_missingBook_throwsNotFound() {
        when(books.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.remove(reader, 99L))
                .isInstanceOf(NotFoundException.class);
        verify(bookmarks, never()).deleteByReaderIdAndBookId(any(), any());
    }

    @Test
    void myBookmarks_returnsBookListItems() {
        BookListItem item = new BookListItem(3L, "T", null, null, false, "author", null, null, 2);
        when(bookmarks.findBookmarkedBooks(7L)).thenReturn(List.of(item));

        assertThat(service.myBookmarks(reader)).containsExactly(item);
    }
}
