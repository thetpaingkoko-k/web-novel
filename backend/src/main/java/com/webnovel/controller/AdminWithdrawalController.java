package com.webnovel.controller;

import com.webnovel.dto.content.RejectRequest;
import com.webnovel.dto.payment.WithdrawalResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.EarningsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin withdrawal review queue (PROJECT SPEC.md §10.7, FR-13.5). */
@RestController
@RequestMapping("/api/v1/admin/withdrawals")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Withdrawals")
public class AdminWithdrawalController {

    private final EarningsService earningsService;

    @GetMapping
    public List<WithdrawalResponse> queue() {
        return earningsService.pendingQueue();
    }

    @PutMapping("/{id}/mark-paid")
    public WithdrawalResponse markPaid(@PathVariable Long id) {
        return earningsService.markPaid(SecurityUtils.currentUserId(), id);
    }

    @PutMapping("/{id}/reject")
    public WithdrawalResponse reject(@PathVariable Long id, @Valid @RequestBody RejectRequest req) {
        return earningsService.reject(SecurityUtils.currentUserId(), id, req.reason());
    }
}
