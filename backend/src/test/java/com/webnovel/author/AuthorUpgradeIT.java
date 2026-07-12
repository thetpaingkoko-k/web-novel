package com.webnovel.author;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Hobbyist→professional upgrade-request flow (§4.1.1). */
class AuthorUpgradeIT extends AuthTestSupport {

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
    void upgradeRequest_setsFlag_appearsInQueue_clearedOnMonetization_thenRejected() throws Exception {
        String email = "upauthor@example.com";
        String token = registerAndGetToken("upauthor", email);
        long userId = userIdOf(email);

        // become a hobbyist author (apply + admin verify)
        mvc.perform(post("/api/v1/authors/apply").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"bio\":\"I write stories\"}"))
                .andExpect(status().isOk());
        String adminToken = seedAdminAndGetToken("upadmin@webnovel.local");
        approve(adminToken, userId, ApproveRequest.Kind.verify_author);
        token = relogin(email);

        // request upgrade -> flag + timestamp set, still hobbyist
        mvc.perform(post("/api/v1/authors/upgrade-request").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.professionalRequested", is(true)))
                .andExpect(jsonPath("$.professionalRequestedAt", notNullValue()))
                .andExpect(jsonPath("$.careerStage", is("hobbyist")));

        // appears in the admin queue with the expected row shape
        mvc.perform(get("/api/v1/admin/authors/upgrade-requests").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].userId", is((int) userId)))
                .andExpect(jsonPath("$[0].username", is("upauthor")))
                .andExpect(jsonPath("$[0].email", is(email)))
                .andExpect(jsonPath("$[0].bio", is("I write stories")))
                .andExpect(jsonPath("$[0].careerStage", is("hobbyist")))
                .andExpect(jsonPath("$[0].requestedAt", notNullValue()));

        // admin enables monetization -> queue entry cleared
        approve(adminToken, userId, ApproveRequest.Kind.enable_monetization);
        mvc.perform(get("/api/v1/admin/authors/upgrade-requests").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // now professional: a further upgrade request is rejected
        token = relogin(email);
        mvc.perform(post("/api/v1/authors/upgrade-request").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("validation_failed")));
    }
}
