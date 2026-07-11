package com.webnovel.repository;

import com.webnovel.domain.entity.ReadingProgress;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, Long> {

    Optional<ReadingProgress> findByReaderIdAndBookId(Long readerId, Long bookId);

    /** The chapter_number of the reader's last-read chapter in a book (spoiler gate, FR-8.3). */
    @Query("""
            select c.chapterNumber
            from ReadingProgress p, Chapter c
            where p.lastChapterReadId = c.id
              and p.readerId = :readerId
              and p.bookId = :bookId
            """)
    Optional<Integer> findLastReadChapterNumber(@Param("readerId") Long readerId, @Param("bookId") Long bookId);
}
