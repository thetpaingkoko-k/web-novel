package com.webnovel.repository;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.enums.BookStatus;
import com.webnovel.dto.content.BookListItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * Public browse/search (§10.3). Joins the author's username and counts
     * published chapters (denormalized read-model fields, §4.1.1). Draft books
     * are excluded from public listings. {@code searchPattern} is a pre-built,
     * lower-cased, wildcard-escaped {@code %term%} LIKE pattern (built by the
     * service) matched against the book title OR the author's username.
     */
    @Query("""
            select new com.webnovel.dto.content.BookListItem(
                b.id, b.title, b.coverImageUrl, b.genre, b.status, b.premium, u.username,
                (select count(c) from Chapter c where c.bookId = b.id and c.status = com.webnovel.domain.enums.ChapterStatus.published))
            from Book b, User u
            where u.id = b.authorId
              and b.status <> com.webnovel.domain.enums.BookStatus.draft
              and (:genre is null or b.genre = :genre)
              and (:status is null or b.status = :status)
              and (:searchPattern is null
                   or lower(b.title) like :searchPattern
                   or lower(u.username) like :searchPattern)
            order by b.createdAt desc
            """)
    List<BookListItem> browse(@Param("genre") String genre, @Param("status") BookStatus status,
                              @Param("searchPattern") String searchPattern);

    /** Books authored by a given user (for the author's own dashboard / public profile). */
    @Query("""
            select new com.webnovel.dto.content.BookListItem(
                b.id, b.title, b.coverImageUrl, b.genre, b.status, b.premium, u.username,
                (select count(c) from Chapter c where c.bookId = b.id and c.status = com.webnovel.domain.enums.ChapterStatus.published))
            from Book b, User u
            where u.id = b.authorId and b.authorId = :authorId
            order by b.createdAt desc
            """)
    List<BookListItem> findByAuthor(@Param("authorId") Long authorId);
}
