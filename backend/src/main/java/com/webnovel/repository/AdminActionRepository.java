package com.webnovel.repository;

import com.webnovel.domain.entity.AdminAction;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminActionRepository extends JpaRepository<AdminAction, Long> {

    Page<AdminAction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<AdminAction> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);
}
