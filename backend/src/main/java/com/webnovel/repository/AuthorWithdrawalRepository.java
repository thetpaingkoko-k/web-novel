package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorWithdrawal;
import com.webnovel.domain.enums.WithdrawalStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorWithdrawalRepository extends JpaRepository<AuthorWithdrawal, Long> {

    List<AuthorWithdrawal> findByAuthorIdOrderByRequestedAtDesc(Long authorId);

    List<AuthorWithdrawal> findByStatusOrderByRequestedAtAsc(WithdrawalStatus status);
}
