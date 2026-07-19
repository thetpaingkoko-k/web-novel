package com.webnovel.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.Role;
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
    @InjectMocks BookService service;

    private static final long AUTHOR_ID = 50L;
    private static final long ADMIN_ID = 1L;

    private final AppUserPrincipal admin =
            new AppUserPrincipal(ADMIN_ID, "admin", Role.admin, false);

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
        verify(books).delete(book);
    }
}
