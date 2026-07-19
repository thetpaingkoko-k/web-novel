package com.webnovel.service;

import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.AuthorWithdrawal;
import com.webnovel.domain.enums.AdminActionType;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.WalletProvider;
import com.webnovel.domain.enums.WithdrawalStatus;
import com.webnovel.dto.payment.BalanceResponse;
import com.webnovel.dto.payment.EarningResponse;
import com.webnovel.dto.payment.PaymentAnalyticsResponse;
import com.webnovel.dto.payment.WithdrawalRequest;
import com.webnovel.dto.payment.WithdrawalResponse;
import com.webnovel.exception.BadRequestException;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorEarningRepository;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.AuthorWithdrawalRepository;
import com.webnovel.security.AppUserPrincipal;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Author earnings, balance, and withdrawals (§6.7, §7.4/7.5). */
@Service
@RequiredArgsConstructor
public class EarningsService {

    private final AuthorProfileRepository authorProfiles;
    private final AuthorEarningRepository earnings;
    private final AuthorWithdrawalRepository withdrawals;
    private final AdminActionService adminActions;
    private final NotificationService notifications;
    private final com.webnovel.config.AppProperties props;

    @Transactional(readOnly = true)
    public BalanceResponse balance(Long authorId, AppUserPrincipal requester) {
        requireSelfOrAdmin(authorId, requester);
        AuthorProfile p = authorProfiles.findByUserId(authorId)
                .orElseThrow(() -> new NotFoundException("author.not_monetized"));
        return new BalanceResponse(p.getAvailableBalance(), p.getTotalEarned());
    }

    @Transactional(readOnly = true)
    public List<EarningResponse> earnings(Long authorId, AppUserPrincipal requester) {
        requireSelfOrAdmin(authorId, requester);
        return earnings.findByAuthorIdOrderByCreatedAtDesc(authorId).stream()
                .map(e -> new EarningResponse(e.getId(), e.getGrossAmount(), e.getPlatformFeePercent(),
                        e.getPlatformFeeAmount(), e.getNetAmount(), e.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WithdrawalResponse> history(Long authorId, AppUserPrincipal requester) {
        requireSelfOrAdmin(authorId, requester);
        return withdrawals.findByAuthorIdOrderByRequestedAtDesc(authorId).stream()
                .map(EarningsService::toResponse).toList();
    }

    /** FR-7.4: request a withdrawal up to the available balance, above the platform minimum. */
    @Transactional
    public WithdrawalResponse request(Long authorId, AppUserPrincipal requester, WithdrawalRequest req) {
        if (!requester.getId().equals(authorId)) {
            throw new ForbiddenException("content.not_author");
        }
        AuthorProfile p = authorProfiles.findByUserId(authorId)
                .orElseThrow(() -> new NotFoundException("author.not_monetized"));
        if (req.amount().compareTo(props.minWithdrawalMmk()) < 0) {
            throw new BadRequestException(ErrorCode.below_minimum, "withdrawal.below_minimum");
        }
        if (req.amount().compareTo(p.getAvailableBalance()) > 0) {
            throw new BadRequestException(ErrorCode.insufficient_balance, "withdrawal.insufficient_balance");
        }
        WalletProvider provider = req.payoutWalletProvider() != null
                ? req.payoutWalletProvider() : p.getPayoutWalletProvider();
        String number = req.payoutWalletNumber() != null
                ? req.payoutWalletNumber() : p.getPayoutWalletNumber();
        if (provider == null || number == null) {
            throw new BadRequestException("withdrawal.below_minimum"); // no payout wallet on file
        }
        AuthorWithdrawal w = new AuthorWithdrawal();
        w.setAuthorId(authorId);
        w.setAmount(req.amount());
        w.setPayoutWalletProvider(provider);
        w.setPayoutWalletNumber(number);
        w.setStatus(WithdrawalStatus.pending);
        AuthorWithdrawal saved = withdrawals.save(w);
        notifications.notifyAdmins(NotificationType.withdrawal_requested, "withdrawal",
                saved.getId(), amountMmk(saved.getAmount())); // nudge admins: a payout awaits review
        return toResponse(saved);
    }

    /**
     * §9.4: platform payment analytics — reader revenue collected, author earnings credited,
     * and the platform's cut, aggregated across every approved payment.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PaymentAnalyticsResponse paymentAnalytics() {
        AuthorEarningRepository.EarningsAggregate agg = earnings.earningsAggregate();
        BigDecimal paidOut = nz(withdrawals.sumAmountByStatus(WithdrawalStatus.paid));
        BigDecimal outstanding = nz(authorProfiles.sumAvailableBalance());
        BigDecimal pendingAmount = nz(withdrawals.sumAmountByStatus(WithdrawalStatus.pending));
        long pendingCount = withdrawals.countByStatus(WithdrawalStatus.pending);
        return new PaymentAnalyticsResponse(
                nz(agg.getTotalGross()), nz(agg.getTotalNet()), nz(agg.getTotalFee()), agg.getCount(),
                paidOut, outstanding, pendingAmount, pendingCount);
    }

    /** §9.4: per-author payout ledger — earned, paid out, and remaining owed, for the admin. */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<com.webnovel.dto.admin.AuthorPayoutRow> authorPayouts() {
        return authorProfiles.findAuthorPayouts();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static String amountMmk(BigDecimal amount) {
        return amount.stripTrailingZeros().toPlainString() + " MMK";
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<WithdrawalResponse> pendingQueue() {
        return withdrawals.findByStatusOrderByRequestedAtAsc(WithdrawalStatus.pending).stream()
                .map(EarningsService::toResponse).toList();
    }

    /** FR-7.5: admin confirms the manual transfer; balance is decremented now. */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public WithdrawalResponse markPaid(Long adminId, Long withdrawalId) {
        AuthorWithdrawal w = requirePending(withdrawalId);
        AuthorProfile p = authorProfiles.findByUserId(w.getAuthorId())
                .orElseThrow(() -> new NotFoundException("author.not_monetized"));
        if (w.getAmount().compareTo(p.getAvailableBalance()) > 0) {
            throw new ConflictException(ErrorCode.insufficient_balance, "withdrawal.insufficient_balance");
        }
        w.setStatus(WithdrawalStatus.paid);
        w.setPaidAt(OffsetDateTime.now());
        w.setReviewedBy(adminId);
        p.setAvailableBalance(p.getAvailableBalance().subtract(w.getAmount()));
        adminActions.log(adminId, AdminActionType.withdrawal_approval, "withdrawal", withdrawalId, null);
        notifications.notify(w.getAuthorId(), NotificationType.withdrawal_approved,
                "withdrawal", withdrawalId, amountMmk(w.getAmount()));
        return toResponse(w);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public WithdrawalResponse reject(Long adminId, Long withdrawalId, String reason) {
        AuthorWithdrawal w = requirePending(withdrawalId);
        w.setStatus(WithdrawalStatus.rejected);
        w.setRejectionReason(reason);
        w.setReviewedBy(adminId);
        return toResponse(w);
    }

    private AuthorWithdrawal requirePending(Long withdrawalId) {
        AuthorWithdrawal w = withdrawals.findById(withdrawalId)
                .orElseThrow(() -> new NotFoundException("withdrawal.not_found"));
        if (w.getStatus() != WithdrawalStatus.pending) {
            throw new ConflictException("error.conflict");
        }
        return w;
    }

    private void requireSelfOrAdmin(Long authorId, AppUserPrincipal requester) {
        if (!requester.isAdmin() && !requester.getId().equals(authorId)) {
            throw new ForbiddenException("content.not_author");
        }
    }

    private static WithdrawalResponse toResponse(AuthorWithdrawal w) {
        return new WithdrawalResponse(w.getId(), w.getAuthorId(), w.getAmount(),
                w.getPayoutWalletProvider(), w.getPayoutWalletNumber(), w.getStatus(),
                w.getRequestedAt(), w.getPaidAt(), w.getRejectionReason());
    }
}
