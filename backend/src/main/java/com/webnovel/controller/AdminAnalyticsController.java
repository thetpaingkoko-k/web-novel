package com.webnovel.controller;

import com.webnovel.dto.admin.AuthorPayoutRow;
import com.webnovel.dto.payment.PaymentAnalyticsResponse;
import com.webnovel.service.EarningsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin platform analytics dashboard (PROJECT SPEC.md §10.7, §9.4). */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Analytics")
public class AdminAnalyticsController {

    private final EarningsService earningsService;

    /** Reader revenue, author earnings, and the platform's profit across all approved payments. */
    @GetMapping("/payments")
    public PaymentAnalyticsResponse payments() {
        return earningsService.paymentAnalytics();
    }

    /** Per-author payout ledger: earned, paid out, and remaining owed to each author (§9.4). */
    @GetMapping("/author-payouts")
    public List<AuthorPayoutRow> authorPayouts() {
        return earningsService.authorPayouts();
    }
}
