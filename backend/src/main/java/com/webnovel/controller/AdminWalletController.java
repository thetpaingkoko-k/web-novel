package com.webnovel.controller;

import com.webnovel.dto.payment.WalletCreateRequest;
import com.webnovel.dto.payment.WalletResponse;
import com.webnovel.service.WalletService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin wallet management (PROJECT SPEC.md §10.6, FR-13.4). */
@RestController
@RequestMapping("/api/v1/admin/wallets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Wallets")
public class AdminWalletController {

    private final WalletService walletService;

    @GetMapping
    public List<WalletResponse> list() {
        return walletService.list();
    }

    @PostMapping
    public ResponseEntity<WalletResponse> create(@Valid @RequestBody WalletCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(walletService.create(req));
    }

    @PutMapping("/{id}/deactivate")
    public WalletResponse deactivate(@PathVariable Long id) {
        return walletService.deactivate(id);
    }
}
