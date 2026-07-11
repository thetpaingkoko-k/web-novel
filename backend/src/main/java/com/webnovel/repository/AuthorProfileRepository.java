package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorProfileRepository extends JpaRepository<AuthorProfile, Long> {

    Optional<AuthorProfile> findByUserId(Long userId);
}
