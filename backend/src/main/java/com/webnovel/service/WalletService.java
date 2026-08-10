package com.webnovel.service;

import com.webnovel.domain.entity.AdminWallet;
import com.webnovel.dto.payment.WalletCreateRequest;
import com.webnovel.dto.payment.WalletResponse;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AdminWalletRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin wallet management + the active wallet a reader pays into (FR-6.1, FR-13.4). */
@Service
@RequiredArgsConstructor
public class WalletService {

    private final AdminWalletRepository wallets;

    @Transactional(readOnly = true)
    public WalletResponse getActive() {
        AdminWallet w = wallets.findFirstByActiveTrueOrderByIdDesc()
                .orElseThrow(() -> new NotFoundException("wallet.none_active"));
        return toResponse(w);
    }

    /** All active wallets a reader may choose to pay into at subscription time (FR-6.1). */
    @Transactional(readOnly = true)
    public List<WalletResponse> listActive() {
        return wallets.findByActiveTrueOrderByIdDesc().stream().map(WalletService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<WalletResponse> list() {
        return wallets.findAllByOrderByIdDesc().stream().map(WalletService::toResponse).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public WalletResponse create(WalletCreateRequest req) {
        AdminWallet w = new AdminWallet();
        w.setProvider(req.provider());
        w.setWalletNumber(req.walletNumber());
        w.setAccountName(req.accountName());
        w.setQrImageUrl(req.qrImageUrl());
        w.setActive(true);
        return toResponse(wallets.save(w));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public WalletResponse deactivate(Long walletId) {
        AdminWallet w = wallets.findById(walletId)
                .orElseThrow(() -> new NotFoundException("wallet.none_active"));
        w.setActive(false);
        return toResponse(w);
    }

    static WalletResponse toResponse(AdminWallet w) {
        return new WalletResponse(w.getId(), w.getProvider(), w.getWalletNumber(),
                w.getAccountName(), w.isActive(), w.getQrImageUrl());
    }
}
