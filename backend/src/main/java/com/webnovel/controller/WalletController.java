package com.webnovel.controller;

import com.webnovel.dto.payment.WalletResponse;
import com.webnovel.service.WalletService;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    @GetMapping("/active")
    public WalletResponse active() {
        return walletService.getActive();
    }
}
