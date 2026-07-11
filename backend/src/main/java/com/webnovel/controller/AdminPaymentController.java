package com.webnovel.controller;

import com.webnovel.domain.enums.PaymentStatus;
import com.webnovel.dto.content.RejectRequest;
import com.webnovel.dto.payment.AdminPaymentRow;
import com.webnovel.dto.payment.PaymentSubmissionResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.PaymentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin payment-submission review queue (PROJECT SPEC.md §10.6, FR-13.3). */
@RestController
@RequestMapping("/api/v1/admin/payment-submissions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Payments")
public class AdminPaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public List<AdminPaymentRow> queue(@RequestParam(defaultValue = "pending") PaymentStatus status) {
        return paymentService.queue(status);
    }

    @PutMapping("/{id}/approve")
    public PaymentSubmissionResponse approve(@PathVariable Long id) {
        return paymentService.approve(SecurityUtils.currentUserId(), id);
    }

    @PutMapping("/{id}/reject")
    public PaymentSubmissionResponse reject(@PathVariable Long id, @Valid @RequestBody RejectRequest req) {
        return paymentService.reject(SecurityUtils.currentUserId(), id, req.reason());
    }
}
