package com.webnovel.repository;

import com.webnovel.domain.entity.ChapterLike;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChapterLikeRepository extends JpaRepository<ChapterLike, Long> {

    boolean existsByChapterIdAndReaderId(Long chapterId, Long readerId);

    /** Derived delete; returns the number of rows removed (0 if the reader hadn't liked it). */
    long deleteByChapterIdAndReaderId(Long chapterId, Long readerId);
}
