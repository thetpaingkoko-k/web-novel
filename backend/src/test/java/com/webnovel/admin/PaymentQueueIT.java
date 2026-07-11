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

    @Test
    void paymentQueueRows_carryAuthorAndWalletProvider() throws Exception {
        registerAndGetToken("payauthor", "payauthor@example.com");
        long authorId = userIdOf("payauthor@example.com");
        String adminToken = seedAdminAndGetToken("payadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("payauthor@example.com");

        // author sets a subscription price
        mvc.perform(put("/api/v1/authors/me").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"monthlySubscriptionPrice\":5000}"))
                .andExpect(status().isOk());

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
}
