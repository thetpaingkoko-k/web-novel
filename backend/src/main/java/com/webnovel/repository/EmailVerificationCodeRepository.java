package com.webnovel.repository;

import com.webnovel.domain.entity.EmailVerificationCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, Long> {

    Optional<EmailVerificationCode> findByUserId(Long userId);

    @Modifying
    @Query("delete from EmailVerificationCode c where c.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
