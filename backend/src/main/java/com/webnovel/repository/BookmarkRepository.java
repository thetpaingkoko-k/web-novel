package com.webnovel.repository;

import com.webnovel.domain.entity.Bookmark;
import com.webnovel.dto.content.BookListItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    boolean existsByReaderIdAndBookId(Long readerId, Long bookId);

    /** Derived delete; returns the number of rows removed (0 if the book wasn't bookmarked). */
    long deleteByReaderIdAndBookId(Long readerId, Long bookId);

    /**
     * The reader's saved books ("My List", §4.1.1) as the same {@link BookListItem}
     * read model {@code GET /books} uses (author username + published-chapter count).
     * Draft books are excluded, mirroring {@link BookRepository#browse} — a bookmarked
     * book whose author reverts it to draft must not leak into the list.
     */
    @Query("""
            select new com.webnovel.dto.content.BookListItem(
                b.id, b.title, b.coverImageUrl, b.status, b.premium, u.username, ap.careerStage,
                (select count(c) from Chapter c where c.bookId = b.id and c.status = com.webnovel.domain.enums.ChapterStatus.published))
            from Bookmark bm, Book b
                join User u on u.id = b.authorId
                left join AuthorProfile ap on ap.userId = b.authorId
            where b.id = bm.bookId
              and bm.readerId = :readerId
              and b.status <> com.webnovel.domain.enums.BookStatus.draft
            order by bm.createdAt desc
            """)
    List<BookListItem> findBookmarkedBooks(@Param("readerId") Long readerId);
}
