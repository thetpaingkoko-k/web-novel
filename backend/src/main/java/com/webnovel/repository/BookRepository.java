package com.webnovel.repository;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.enums.BookStatus;
import com.webnovel.domain.enums.Genre;
import com.webnovel.dto.content.BookGenreRow;
import com.webnovel.dto.content.BookListItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * Public browse/search (§10.3). Joins the author's username and counts
     * published chapters (denormalized read-model fields, §4.1.1). Draft and
     * admin-hidden books are excluded from public listings. {@code searchPattern} is a pre-built,
     * lower-cased, wildcard-escaped {@code %term%} LIKE pattern (built by the
     * service) matched against the book title OR the author's username.
     * {@code genre} filters to books containing that genre ({@code member of});
     * genres themselves are not projected here — the service batch-loads them.
     */
    @Query("""
            select new com.webnovel.dto.content.BookListItem(
                b.id, b.title, b.coverImageUrl, b.status, b.premium, u.username, u.avatarUrl, ap.careerStage,
                (select count(c) from Chapter c where c.bookId = b.id and c.status = com.webnovel.domain.enums.ChapterStatus.published))
            from Book b
                join User u on u.id = b.authorId
                left join AuthorProfile ap on ap.userId = b.authorId
            where b.status <> com.webnovel.domain.enums.BookStatus.draft
              and b.hidden = false
              and (:genre is null or :genre member of b.genres)
              and (:status is null or b.status = :status)
              and (:searchPattern is null
                   or lower(b.title) like :searchPattern
                   or lower(u.username) like :searchPattern)
            order by b.createdAt desc
            """)
    List<BookListItem> browse(@Param("genre") Genre genre, @Param("status") BookStatus status,
                              @Param("searchPattern") String searchPattern);

    /** Books authored by a given user (for the author's own dashboard / public profile). */
    @Query("""
            select new com.webnovel.dto.content.BookListItem(
                b.id, b.title, b.coverImageUrl, b.status, b.premium, u.username, u.avatarUrl, ap.careerStage,
                (select count(c) from Chapter c where c.bookId = b.id and c.status = com.webnovel.domain.enums.ChapterStatus.published))
            from Book b
                join User u on u.id = b.authorId
                left join AuthorProfile ap on ap.userId = b.authorId
            where b.authorId = :authorId
            order by b.createdAt desc
            """)
    List<BookListItem> findByAuthor(@Param("authorId") Long authorId);

    /** Batch-loads (bookId, genre) pairs for the given books so list rows can be populated. */
    @Query("""
            select new com.webnovel.dto.content.BookGenreRow(b.id, g)
            from Book b join b.genres g
            where b.id in :bookIds
            """)
    List<BookGenreRow> findGenresByBookIds(@Param("bookIds") Collection<Long> bookIds);

    /** Bumps the denormalized book-level unique-view counter (§9.2, FR-5.3). */
    @org.springframework.data.jpa.repository.Modifying
    @Query("update Book b set b.viewCount = b.viewCount + 1 where b.id = :id")
    void incrementViewCount(@Param("id") Long id);
}
