package com.webnovel.admin;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Admin payment queue rows carry the target author and wallet provider (§4.1.1, FR-13.3). */
class PaymentQueueIT extends AuthTestSupport {

    private void approve(String adminToken, long userId, ApproveRequest.Kind kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    private String relogin(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    /**
     * CHANGE 3: an author-role user can subscribe to (and pay for) ANOTHER author, and the
     * submission reaches the admin payment queue just like a reader's. Subscribing to oneself
     * is rejected (400).
     */
    @Test
    void authorCanSubscribeToAnotherAuthor_selfSubscribeRejected() throws Exception {
        // authorA is the paying subscriber (a professional author, not a plain reader)
        registerAndGetToken("subauthorA", "subauthorA@example.com");
        long authorAId = userIdOf("subauthorA@example.com");
        String adminToken = seedAdminAndGetToken("subadmin@webnovel.local");
        approve(adminToken, authorAId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorAId, ApproveRequest.Kind.enable_monetization);
        String authorA = relogin("subauthorA@example.com"); // token now carries the author role

        // authorB is the subscription target
        registerAndGetToken("subauthorB", "subauthorB@example.com");
        long authorBId = userIdOf("subauthorB@example.com");
        approve(adminToken, authorBId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorBId, ApproveRequest.Kind.enable_monetization);

        String wallet = mvc.perform(post("/api/v1/admin/wallets").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"provider":"KBZPay","walletNumber":"09-777-000-222","accountName":"WebNovel Co"}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long walletId = objectMapper.readTree(wallet).get("walletId").asLong();

        // author→author subscription payment: allowed (was 403 before widening the auth) → 201
        mvc.perform(post("/api/v1/authors/{id}/payment-submissions", authorBId)
                        .header("Authorization", bearer(authorA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletId":%d,"screenshotUrl":"https://x/s.png","last6Digits":"654321"}"""
                                .formatted(walletId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("pending")));

        // it shows up in the admin queue exactly like a reader's submission
        mvc.perform(get("/api/v1/admin/payment-submissions?status=pending")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.readerUsername == 'subauthorA')].authorUsername",
                        is(List.of("subauthorB"))));

        // subscribing to yourself is rejected → 400
        mvc.perform(post("/api/v1/authors/{id}/payment-submissions", authorAId)
                        .header("Authorization", bearer(authorA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletId":%d,"screenshotUrl":"https://x/s.png","last6Digits":"111111"}"""
                                .formatted(walletId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void paymentQueueRows_carryAuthorAndWalletProvider() throws Exception {
        registerAndGetToken("payauthor", "payauthor@example.com");
        long authorId = userIdOf("payauthor@example.com");
        String adminToken = seedAdminAndGetToken("payadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        // enabling monetization applies the 5000 MMK baseline price automatically (FR-1.5)
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);

        // admin creates the platform wallet the reader pays into
        String wallet = mvc.perform(post("/api/v1/admin/wallets").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"provider":"KBZPay","walletNumber":"09-777-000-111","accountName":"WebNovel Co"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountName", is("WebNovel Co")))
                .andReturn().getResponse().getContentAsString();
        long walletId = objectMapper.readTree(wallet).get("walletId").asLong();

        // the reader-facing active-wallet list carries the account name and provider (FR-6.1)
        mvc.perform(get("/api/v1/wallets").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.walletId == %d)].accountName".formatted(walletId),
                        is(List.of("WebNovel Co"))));

        // reader submits proof of payment for that author — no amount is sent (fixed 5000 baseline)
        String reader = registerAndGetToken("payreader", "payreader@example.com");
        String submission = mvc.perform(post("/api/v1/authors/{id}/payment-submissions", authorId)
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletId":%d,"screenshotUrl":"https://x/s.png","last6Digits":"123456"}"""
                                .formatted(walletId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("pending")))
                .andExpect(jsonPath("$.amount", is(5000.0)))
                .andReturn().getResponse().getContentAsString();
        long submissionId = objectMapper.readTree(submission).get("submissionId").asLong();

        // queue row carries the joined author, wallet provider, and wallet account name
        mvc.perform(get("/api/v1/admin/payment-submissions?status=pending")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.readerUsername == 'payreader')].authorId",
                        is(List.of((int) authorId))))
                .andExpect(jsonPath("$[?(@.readerUsername == 'payreader')].authorUsername",
                        is(List.of("payauthor"))))
                .andExpect(jsonPath("$[?(@.readerUsername == 'payreader')].walletProvider",
                        is(List.of("KBZPay"))))
                .andExpect(jsonPath("$[?(@.readerUsername == 'payreader')].walletAccountName",
                        is(List.of("WebNovel Co"))));

        // non-admin cannot read the queue
        mvc.perform(get("/api/v1/admin/payment-submissions").header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());

        // approving the payment feeds the admin analytics dashboard (§9.4):
        // revenue 5000 = author earnings 4000 (net) + platform profit 1000 (20% fee)
        mvc.perform(put("/api/v1/admin/payment-submissions/{id}/approve", submissionId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/analytics/payments").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReaderRevenue", is(5000.0)))
                .andExpect(jsonPath("$.totalAuthorEarnings", is(4000.0)))
                .andExpect(jsonPath("$.platformProfit", is(1000.0)))
                .andExpect(jsonPath("$.approvedPaymentCount", is(1)))
                // nothing withdrawn yet: the full 4000 net is still held on the author's behalf
                .andExpect(jsonPath("$.totalPaidOut", is(0)))
                .andExpect(jsonPath("$.outstandingAuthorBalance", is(4000.0)))
                .andExpect(jsonPath("$.pendingWithdrawalAmount", is(0)))
                .andExpect(jsonPath("$.pendingWithdrawalCount", is(0)));

        // the per-author payout ledger lists the author with their earned + remaining amounts
        mvc.perform(get("/api/v1/admin/analytics/author-payouts").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.username == 'payauthor')].totalEarned", is(List.of(4000.0))))
                .andExpect(jsonPath("$[?(@.username == 'payauthor')].availableBalance", is(List.of(4000.0))))
                .andExpect(jsonPath("$[?(@.username == 'payauthor')].totalPaidOut", is(List.of(0))))
                .andExpect(jsonPath("$[?(@.username == 'payauthor')].pendingAmount", is(List.of(0))))
                .andExpect(jsonPath("$[?(@.username == 'payauthor')].pendingCount", is(List.of(0))));

        // the per-author ledger is admin-only
        mvc.perform(get("/api/v1/admin/analytics/author-payouts").header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());

        // the analytics dashboard is admin-only
        mvc.perform(get("/api/v1/admin/analytics/payments").header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());

        // admin user rows: plain reader has no career stage
        mvc.perform(get("/api/v1/admin/users?search=payreader").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].careerStage", nullValue()));
    }

    @Test
    void monetization_appliesBaselinePrice_andAdminCanAdjustIt() throws Exception {
        registerAndGetToken("baseauthor", "baseauthor@example.com");
        long authorId = userIdOf("baseauthor@example.com");
        String adminToken = seedAdminAndGetToken("baseadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);

        // enabling monetization applies the 5000 MMK baseline automatically — no author step,
        // so the author is immediately subscribable (the reader's Subscribe button appears).
        mvc.perform(get("/api/v1/admin/users?search=baseauthor").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].monetizationEnabled", is(true)))
                .andExpect(jsonPath("$[0].monthlySubscriptionPrice", is(5000.0)));
        mvc.perform(get("/api/v1/authors/{id}", authorId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlySubscriptionPrice", is(5000.0)));

        // admin adjusts the price; it is reflected on the public profile and audited
        mvc.perform(put("/api/v1/admin/users/{id}/subscription-price", authorId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"priceMmk\":8000}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/authors/{id}", authorId))
                .andExpect(jsonPath("$.monthlySubscriptionPrice", is(8000.0)));
        mvc.perform(get("/api/v1/admin/actions").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].actionType", is("subscription_price_update")))
                .andExpect(jsonPath("$[0].targetLabel", is("baseauthor")));

        // a non-monetized user (no author profile) cannot have a price set
        registerAndGetToken("pqplainreader", "pqplainreader@example.com");
        long readerId = userIdOf("pqplainreader@example.com");
        mvc.perform(put("/api/v1/admin/users/{id}/subscription-price", readerId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"priceMmk\":8000}"))
                .andExpect(status().isBadRequest());
    }
}
