package com.webnovel.repository;

import com.webnovel.domain.entity.AdminWallet;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminWalletRepository extends JpaRepository<AdminWallet, Long> {

    Optional<AdminWallet> findFirstByActiveTrueOrderByIdDesc();

    List<AdminWallet> findByActiveTrueOrderByIdDesc();

    List<AdminWallet> findAllByOrderByIdDesc();
}
