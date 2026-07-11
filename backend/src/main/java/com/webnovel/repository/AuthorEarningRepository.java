package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorEarning;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorEarningRepository extends JpaRepository<AuthorEarning, Long> {

    List<AuthorEarning> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    boolean existsByPaymentSubmissionId(Long paymentSubmissionId);
}
