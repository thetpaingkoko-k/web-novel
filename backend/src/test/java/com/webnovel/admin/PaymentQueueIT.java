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
                                {"provider":"KBZPay","walletNumber":"09-777-000-111"}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long walletId = objectMapper.readTree(wallet).get("walletId").asLong();

        // reader submits proof of payment for that author
        String reader = registerAndGetToken("payreader", "payreader@example.com");
        mvc.perform(post("/api/v1/authors/{id}/payment-submissions", authorId)
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletId":%d,"amount":5000,"screenshotUrl":"https://x/s.png","last6Digits":"123456"}"""
                                .formatted(walletId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("pending")));

        // queue row carries the joined author and wallet provider
        mvc.perform(get("/api/v1/admin/payment-submissions?status=pending")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.readerUsername == 'payreader')].authorId",
                        is(List.of((int) authorId))))
                .andExpect(jsonPath("$[?(@.readerUsername == 'payreader')].authorUsername",
                        is(List.of("payauthor"))))
                .andExpect(jsonPath("$[?(@.readerUsername == 'payreader')].walletProvider",
                        is(List.of("KBZPay"))));

        // non-admin cannot read the queue
        mvc.perform(get("/api/v1/admin/payment-submissions").header("Authorization", bearer(reader)))
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
