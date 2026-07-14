package com.webnovel.service;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.AuthorEarning;
import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.PaymentSubmission;
import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.PaymentStatus;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.dto.payment.AdminPaymentRow;
import com.webnovel.dto.payment.PaymentSubmissionRequest;
import com.webnovel.dto.payment.PaymentSubmissionResponse;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AdminWalletRepository;
import com.webnovel.repository.AuthorEarningRepository;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.PaymentSubmissionRepository;
import com.webnovel.repository.SubscriptionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manual-wallet payment submission (§9.3) and admin approval → direct earning credit (§9.4). */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentSubmissionRepository submissions;
    private final SubscriptionRepository subscriptions;
    private final AdminWalletRepository wallets;
    private final AuthorProfileRepository authorProfiles;
    private final AuthorEarningRepository earnings;
    private final AdminActionService adminActions;
    private final AppProperties props;

    /** §9.3: create/reuse a pending subscription, run the duplicate check, persist the submission. */
    @Transactional
    public PaymentSubmissionResponse submit(Long readerId, Long authorId, PaymentSubmissionRequest req) {
        wallets.findById(req.walletId())
                .orElseThrow(() -> new NotFoundException("wallet.none_active"));
        AuthorProfile author = authorProfiles.findByUserId(authorId)
                .orElseThrow(() -> new BadRequestException("author.not_monetized"));
        if (!author.isMonetizationEnabled() || author.getMonthlySubscriptionPrice() == null) {
            throw new BadRequestException("author.not_monetized");
        }

        Subscription subscription = resolveSubscription(readerId, authorId, author.getMonthlySubscriptionPrice());

        boolean collision = submissions.existsByWalletIdAndLast6DigitsAndAmountAndStatus(
                req.walletId(), req.last6Digits(), req.amount(), PaymentStatus.approved);

        PaymentSubmission submission = new PaymentSubmission();
        submission.setReaderId(readerId);
        submission.setWalletId(req.walletId());
        submission.setSubscriptionId(subscription.getId());
        submission.setAmount(req.amount());
        submission.setScreenshotUrl(req.screenshotUrl());
        submission.setLast6Digits(req.last6Digits());
        submission.setStatus(collision ? PaymentStatus.flagged_duplicate : PaymentStatus.pending);
        submissions.save(submission);
        return toResponse(submission);
    }

    private Subscription resolveSubscription(Long readerId, Long authorId, BigDecimal price) {
        List<Subscription> open = subscriptions.findOpen(readerId, authorId);
        for (Subscription s : open) {
            if (s.getStatus() == SubscriptionStatus.active) {
                throw new ConflictException("subscription.already_active"); // §8.3
            }
        }
        return open.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.pending_payment)
                .findFirst()
                .orElseGet(() -> {
                    Subscription s = new Subscription();
                    s.setReaderId(readerId);
                    s.setAuthorId(authorId);
                    s.setStatus(SubscriptionStatus.pending_payment);
                    s.setPriceMmk(price); // snapshot at request time (FR-6.2)
                    return subscriptions.save(s);
                });
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminPaymentRow> queue(PaymentStatus status) {
        return submissions.findQueueByStatus(status);
    }

    /**
     * §9.4: approve atomically — activate the subscription, create exactly one earning
     * (fee split), and increment the author's denormalized balances, all in one transaction.
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PaymentSubmissionResponse approve(Long adminId, Long submissionId) {
        PaymentSubmission submission = submissions.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("payment.not_found"));
        if (submission.getStatus() == PaymentStatus.approved
                || earnings.existsByPaymentSubmissionId(submissionId)) {
            throw new ConflictException("error.conflict"); // never credit twice (§7.4)
        }
        submission.setStatus(PaymentStatus.approved);
        submission.setReviewedBy(adminId);
        submission.setReviewedAt(OffsetDateTime.now());

        Subscription subscription = subscriptions.findById(submission.getSubscriptionId())
                .orElseThrow(() -> new NotFoundException("payment.not_found"));
        OffsetDateTime now = OffsetDateTime.now();
        subscription.setStatus(SubscriptionStatus.active);
        subscription.setStartDate(now);
        subscription.setEndDate(now.plusDays(props.subscriptionDays()));

        BigDecimal gross = submission.getAmount();
        BigDecimal feePercent = props.platformFeePercent();
        BigDecimal feeAmount = gross.multiply(feePercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal net = gross.subtract(feeAmount);

        AuthorEarning earning = new AuthorEarning();
        earning.setAuthorId(subscription.getAuthorId());
        earning.setPaymentSubmissionId(submission.getId());
        earning.setSubscriptionId(subscription.getId());
        earning.setGrossAmount(gross);
        earning.setPlatformFeePercent(feePercent);
        earning.setPlatformFeeAmount(feeAmount);
        earning.setNetAmount(net);
        earnings.save(earning);

        AuthorProfile author = authorProfiles.findByUserId(subscription.getAuthorId())
                .orElseThrow(() -> new NotFoundException("author.not_monetized"));
        author.setAvailableBalance(author.getAvailableBalance().add(net));
        author.setTotalEarned(author.getTotalEarned().add(net));

        adminActions.log(adminId, AdminActionType.payment_approval,
                "payment_submission", submission.getId(), null); // §7.3 audit
        return toResponse(submission);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PaymentSubmissionResponse reject(Long adminId, Long submissionId, String reason) {
        PaymentSubmission submission = submissions.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("payment.not_found"));
        if (submission.getStatus() == PaymentStatus.approved) {
            throw new ConflictException("error.conflict");
        }
        submission.setStatus(PaymentStatus.rejected);
        submission.setRejectionReason(reason);
        submission.setReviewedBy(adminId);
        submission.setReviewedAt(OffsetDateTime.now());

        adminActions.log(adminId, AdminActionType.payment_rejection,
                "payment_submission", submission.getId(), reason); // §7.3 audit
        return toResponse(submission);
    }

    static PaymentSubmissionResponse toResponse(PaymentSubmission s) {
        return new PaymentSubmissionResponse(
                s.getId(), s.getSubscriptionId(), s.getAmount(), s.getLast6Digits(),
                s.getStatus(), s.getRejectionReason(), s.getSubmittedAt());
    }
}
