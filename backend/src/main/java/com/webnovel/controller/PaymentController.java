package com.webnovel.controller;

import com.webnovel.dto.payment.PaymentSubmissionRequest;
import com.webnovel.dto.payment.PaymentSubmissionResponse;
import com.webnovel.dto.payment.SubscriptionResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.PaymentService;
import com.webnovel.service.SubscriptionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Reader payment submission + own subscriptions (PROJECT SPEC.md §10.6); readers only. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@PreAuthorize("hasRole('READER')")
@Tag(name = "Payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final SubscriptionService subscriptionService;

    @PostMapping("/authors/{authorId}/payment-submissions")
    public ResponseEntity<PaymentSubmissionResponse> submit(
            @PathVariable Long authorId, @Valid @RequestBody PaymentSubmissionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.submit(SecurityUtils.currentUserId(), authorId, req));
    }

    @GetMapping("/subscriptions/me")
    public List<SubscriptionResponse> mySubscriptions() {
        return subscriptionService.mySubscriptions(SecurityUtils.currentUserId());
    }
}
