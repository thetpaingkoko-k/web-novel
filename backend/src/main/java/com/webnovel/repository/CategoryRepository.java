package com.webnovel.repository;

import com.webnovel.domain.entity.Category;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderBySortOrderAscNameAsc();

    List<Category> findByActiveTrueOrderBySortOrderAscNameAsc();

    Optional<Category> findByCode(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    boolean existsByNameIgnoreCase(String name);

    /** Codes among {@code codes} that exist and are still active — used to validate book payloads. */
    @Query("select c.code from Category c where c.active = true and c.code in :codes")
    List<String> findActiveCodesIn(@Param("codes") Collection<String> codes);
}
