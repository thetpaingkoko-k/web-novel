package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.Role;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.BookmarkRepository;
import com.webnovel.repository.ChapterCommentRepository;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** An admin deleting an author's book notifies that author (book_deleted). */
@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock BookRepository books;
    @Mock ChapterRepository chapters;
    @Mock UserRepository users;
    @Mock AuthorProfileRepository authorProfiles;
    @Mock BookmarkRepository bookmarks;
    @Mock ChapterCommentRepository comments;
    @Mock NotificationService notifications;
    @Mock AdminActionService adminActions;
    @InjectMocks BookService service;

    private static final long AUTHOR_ID = 50L;
    private static final long ADMIN_ID = 1L;

    private final AppUserPrincipal admin =
            new AppUserPrincipal(ADMIN_ID, "admin", Role.admin, false);
    private final AppUserPrincipal author =
            new AppUserPrincipal(AUTHOR_ID, "author", Role.hobbyist_author, false);

    private Book book() {
        Book b = new Book();
        b.setId(10L);
        b.setAuthorId(AUTHOR_ID);
        b.setTitle("Doomed Tale");
        return b;
    }

    @Test
    void delete_byAdmin_notifiesTheAuthor() {
        Book book = book();
        when(books.findById(10L)).thenReturn(Optional.of(book));

        service.delete(admin, 10L);

        verify(notifications)
                .notify(AUTHOR_ID, NotificationType.book_deleted, null, null, "Doomed Tale");
        verify(adminActions).log(ADMIN_ID, AdminActionType.content_removal, "book", 10L, null);
        verify(books).delete(book);
    }

    @Test
    void setHidden_true_byAdmin_hidesAuditsAndNotifiesAuthor() {
        Book book = book();
        when(books.findById(10L)).thenReturn(Optional.of(book));

        service.setHidden(admin, 10L, true);

        assertThat(book.isHidden()).isTrue();
        verify(adminActions).log(ADMIN_ID, AdminActionType.content_removal, "book", 10L, null);
        verify(notifications)
                .notify(AUTHOR_ID, NotificationType.content_removed, "book", 10L, "Doomed Tale");
    }

    @Test
    void setHidden_false_byAdmin_restoresAndAuditsWithoutNotifying() {
        Book book = book();
        book.setHidden(true);
        when(books.findById(10L)).thenReturn(Optional.of(book));

        service.setHidden(admin, 10L, false);

        assertThat(book.isHidden()).isFalse();
        verify(adminActions).log(ADMIN_ID, AdminActionType.content_approval, "book", 10L, null);
        verify(notifications, never())
                .notify(AUTHOR_ID, NotificationType.content_removed, "book", 10L, "Doomed Tale");
    }

    @Test
    void setHidden_byNonAdmin_isForbidden() {
        assertThatThrownBy(() -> service.setHidden(author, 10L, true))
                .isInstanceOf(ForbiddenException.class);
        verify(books, never()).findById(10L);
    }
}
