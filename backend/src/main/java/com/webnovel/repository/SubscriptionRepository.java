package com.webnovel.repository;

import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.dto.payment.SubscriptionResponse;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    /** A reader's subscriptions across all authors, with joined author username (§10.6, §4.1.1). */
    @Query("""
            select new com.webnovel.dto.payment.SubscriptionResponse(
                s.id, s.authorId, u.username, s.status, s.startDate, s.endDate, s.priceMmk)
            from Subscription s, User u
            where u.id = s.authorId and s.readerId = :readerId
            order by s.id desc
            """)
    List<SubscriptionResponse> findMySubscriptions(@Param("readerId") Long readerId);

    /** The most recent active/expired subscription for a reader→author pair (drives access control §9.1). */
    @Query("""
            select s from Subscription s
            where s.readerId = :readerId and s.authorId = :authorId
              and s.status in (com.webnovel.domain.enums.SubscriptionStatus.active,
                               com.webnovel.domain.enums.SubscriptionStatus.expired)
            order by s.endDate desc nulls last
            """)
    List<Subscription> findRelevant(@Param("readerId") Long readerId, @Param("authorId") Long authorId);

    /** Any non-expired (pending_payment or active) subscription for the pair — the §8.3 uniqueness guard. */
    @Query("""
            select s from Subscription s
            where s.readerId = :readerId and s.authorId = :authorId
              and s.status in (com.webnovel.domain.enums.SubscriptionStatus.pending_payment,
                               com.webnovel.domain.enums.SubscriptionStatus.active)
            """)
    List<Subscription> findOpen(@Param("readerId") Long readerId, @Param("authorId") Long authorId);

    List<Subscription> findByReaderIdOrderByIdDesc(Long readerId);

    /** How many readers currently hold a subscription in the given state to an author (§4.1.1). */
    long countByAuthorIdAndStatus(Long authorId, SubscriptionStatus status);

    List<Subscription> findByStatusAndReminderSentFalseAndEndDateBefore(
            SubscriptionStatus status, java.time.OffsetDateTime before);

    /** The subscriptions the expiry sweep is about to flip — used to notify each reader. */
    List<Subscription> findByStatusAndEndDateBefore(
            SubscriptionStatus status, java.time.OffsetDateTime before);

    /** Expiry sweep: flip active subscriptions whose window has ended to {@code expired}. */
    @org.springframework.data.jpa.repository.Modifying
    @Query("""
            update Subscription s set s.status = com.webnovel.domain.enums.SubscriptionStatus.expired
            where s.status = com.webnovel.domain.enums.SubscriptionStatus.active and s.endDate < :now
            """)
    int expireEnded(@Param("now") java.time.OffsetDateTime now);
}
