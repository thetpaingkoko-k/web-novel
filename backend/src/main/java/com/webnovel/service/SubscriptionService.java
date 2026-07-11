package com.webnovel.service;

import com.webnovel.dto.payment.SubscriptionResponse;
import com.webnovel.repository.SubscriptionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A reader's own subscriptions across authors (§10.6). */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptions;

    @Transactional(readOnly = true)
    public List<SubscriptionResponse> mySubscriptions(Long readerId) {
        return subscriptions.findMySubscriptions(readerId);
    }
}
