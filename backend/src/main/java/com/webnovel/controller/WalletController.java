package com.webnovel.controller;

import com.webnovel.dto.payment.WalletResponse;
import com.webnovel.service.WalletService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The active wallet a reader pays into (PROJECT SPEC.md §10.6). */
@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@Tag(name = "Wallets")
public class WalletController {

    private final WalletService walletService;

    /** Every active wallet the reader may choose from when submitting a payment (FR-6.1). */
    @GetMapping
    public List<WalletResponse> activeWallets() {
        return walletService.listActive();
    }

    @GetMapping("/active")
    public WalletResponse active() {
        return walletService.getActive();
    }
}
