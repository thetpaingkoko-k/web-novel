package com.webnovel.service;

import com.webnovel.domain.entity.Bookmark;
import com.webnovel.dto.content.BookListItem;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.BookmarkRepository;
import com.webnovel.security.AppUserPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Saved books / "My List" — beyond-spec additive feature (§4.1.1). */
@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarks;
    private final BookRepository books;

    @Transactional(readOnly = true)
    public List<BookListItem> myBookmarks(AppUserPrincipal reader) {
        return BookService.populateGenres(bookmarks.findBookmarkedBooks(reader.getId()), books);
    }

    /** Idempotent: bookmarking an already-bookmarked book is a no-op, not an error. */
    @Transactional
    public void add(AppUserPrincipal reader, Long bookId) {
        requireBook(bookId);
        if (!bookmarks.existsByReaderIdAndBookId(reader.getId(), bookId)) {
            Bookmark bookmark = new Bookmark();
            bookmark.setReaderId(reader.getId());
            bookmark.setBookId(bookId);
            bookmarks.save(bookmark);
        }
    }

    /** Idempotent: removing a bookmark that doesn't exist is a no-op, not an error. */
    @Transactional
    public void remove(AppUserPrincipal reader, Long bookId) {
        requireBook(bookId);
        bookmarks.deleteByReaderIdAndBookId(reader.getId(), bookId);
    }

    private void requireBook(Long bookId) {
        if (!books.existsById(bookId)) {
            throw new NotFoundException("book.not_found");
        }
    }
}
