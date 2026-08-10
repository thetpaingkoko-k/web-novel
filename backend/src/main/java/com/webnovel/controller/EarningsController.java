package com.webnovel.controller;

import com.webnovel.dto.payment.BalanceResponse;
import com.webnovel.dto.payment.EarningResponse;
import com.webnovel.dto.payment.WithdrawalRequest;
import com.webnovel.dto.payment.WithdrawalResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.EarningsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Author earnings, balance, and withdrawals (PROJECT SPEC.md §10.7). Earnings exist
 * only for monetized professional authors (§5), so hobbyists are barred at the API
 * layer; admins retain access per §10.7 ("Author/Admin"). Per-row self/owner checks
 * still run in the service.
 */
@RestController
@RequestMapping("/api/v1/authors")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PROFESSIONAL_AUTHOR','ADMIN')")
@Tag(name = "Earnings")
public class EarningsController {

    private final EarningsService earningsService;

    @GetMapping("/{id}/earnings")
    public List<EarningResponse> earnings(@PathVariable Long id) {
        return earningsService.earnings(id, SecurityUtils.requirePrincipal());
    }

    @GetMapping("/{id}/balance")
    public BalanceResponse balance(@PathVariable Long id) {
        return earningsService.balance(id, SecurityUtils.requirePrincipal());
    }

    @PostMapping("/{id}/withdrawals")
    public ResponseEntity<WithdrawalResponse> requestWithdrawal(
            @PathVariable Long id, @Valid @RequestBody WithdrawalRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(earningsService.request(id, SecurityUtils.requirePrincipal(), req));
    }

    @GetMapping("/{id}/withdrawals")
    public List<WithdrawalResponse> withdrawals(@PathVariable Long id) {
        return earningsService.history(id, SecurityUtils.requirePrincipal());
    }
}
