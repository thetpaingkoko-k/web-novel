package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.config.AppProperties;
import com.webnovel.domain.entity.AuthorEarning;
import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.domain.entity.PaymentSubmission;
import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.PaymentStatus;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.exception.ConflictException;
import com.webnovel.repository.AdminWalletRepository;
import com.webnovel.repository.AuthorEarningRepository;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.PaymentSubmissionRepository;
import com.webnovel.repository.SubscriptionRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** §9.4 atomic settlement: fee split, single credit, subscription activation, balance increment. */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock PaymentSubmissionRepository submissions;
    @Mock SubscriptionRepository subscriptions;
    @Mock AdminWalletRepository wallets;
    @Mock AuthorProfileRepository authorProfiles;
    @Mock AuthorEarningRepository earnings;

    private final AppProperties props = new AppProperties(
            new AppProperties.Jwt("unit-test-secret-value-at-least-32-bytes!!",
                    java.time.Duration.ofMinutes(15), java.time.Duration.ofDays(30)),
            new BigDecimal("20"), new BigDecimal("5000"), 30,
            new AppProperties.Cors(List.of("http://localhost:5173")));

    private PaymentService service() {
        return new PaymentService(submissions, subscriptions, wallets, authorProfiles, earnings, props);
    }

    @Test
    void approve_splitsFeeCreditsAuthor_andActivatesSubscription() {
        PaymentSubmission sub = new PaymentSubmission();
        sub.setId(1L);
        sub.setSubscriptionId(9L);
        sub.setAmount(new BigDecimal("10000"));
        sub.setStatus(PaymentStatus.pending);

        Subscription subscription = new Subscription();
        subscription.setId(9L);
        subscription.setAuthorId(50L);
        subscription.setStatus(SubscriptionStatus.pending_payment);

        AuthorProfile author = new AuthorProfile();
        author.setUserId(50L);
        author.setAvailableBalance(new BigDecimal("1000"));
        author.setTotalEarned(new BigDecimal("1000"));

        when(submissions.findById(1L)).thenReturn(Optional.of(sub));
        when(earnings.existsByPaymentSubmissionId(1L)).thenReturn(false);
        when(subscriptions.findById(9L)).thenReturn(Optional.of(subscription));
        when(authorProfiles.findByUserId(50L)).thenReturn(Optional.of(author));

        service().approve(99L, 1L);

        // fee = 20% of 10000 = 2000; net = 8000
        ArgumentCaptor<AuthorEarning> earningCaptor = ArgumentCaptor.forClass(AuthorEarning.class);
        verify(earnings).save(earningCaptor.capture());
        AuthorEarning earning = earningCaptor.getValue();
        assertThat(earning.getPlatformFeeAmount()).isEqualByComparingTo("2000");
        assertThat(earning.getNetAmount()).isEqualByComparingTo("8000");
        assertThat(earning.getPaymentSubmissionId()).isEqualTo(1L);

        // subscription activated with a 30-day window
        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.active);
        assertThat(subscription.getStartDate()).isNotNull();
        assertThat(subscription.getEndDate()).isAfter(subscription.getStartDate());

        // balances incremented by net only
        assertThat(author.getAvailableBalance()).isEqualByComparingTo("9000");
        assertThat(author.getTotalEarned()).isEqualByComparingTo("9000");
        assertThat(sub.getStatus()).isEqualTo(PaymentStatus.approved);
    }

    @Test
    void approve_alreadyCredited_throwsAndDoesNotDoubleCredit() {
        PaymentSubmission sub = new PaymentSubmission();
        sub.setId(1L);
        sub.setStatus(PaymentStatus.pending);
        when(submissions.findById(1L)).thenReturn(Optional.of(sub));
        when(earnings.existsByPaymentSubmissionId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service().approve(99L, 1L)).isInstanceOf(ConflictException.class);
        verify(earnings, never()).save(any());
    }

    @Test
    void submit_duplicateApprovedPayment_flagsDuplicate() {
        AuthorProfile author = new AuthorProfile();
        author.setMonetizationEnabled(true);
        author.setMonthlySubscriptionPrice(new BigDecimal("10000"));
        when(wallets.findById(3L)).thenReturn(Optional.of(new com.webnovel.domain.entity.AdminWallet()));
        when(authorProfiles.findByUserId(50L)).thenReturn(Optional.of(author));
        when(subscriptions.findOpen(7L, 50L)).thenReturn(List.of());
        when(subscriptions.save(any())).thenAnswer(i -> { Subscription s = i.getArgument(0); s.setId(9L); return s; });
        when(submissions.existsByWalletIdAndLast6DigitsAndAmountAndStatus(
                3L, "123456", new BigDecimal("10000"), PaymentStatus.approved)).thenReturn(true);

        ArgumentCaptor<PaymentSubmission> captor = ArgumentCaptor.forClass(PaymentSubmission.class);
        when(submissions.save(captor.capture())).thenAnswer(i -> i.getArgument(0));

        service().submit(7L, 50L, new com.webnovel.dto.payment.PaymentSubmissionRequest(
                3L, new BigDecimal("10000"), "http://x/y.png", "123456"));

        assertThat(captor.getValue().getStatus()).isEqualTo(PaymentStatus.flagged_duplicate);
    }
}
