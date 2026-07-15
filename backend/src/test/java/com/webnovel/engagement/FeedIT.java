package com.webnovel.engagement;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** FR-11: premium feed gating applies only to monetized authors; hobbyist feeds are free. */
class FeedIT extends AuthTestSupport {

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

    private void postPremiumFeed(String token, long authorId) throws Exception {
        mvc.perform(post("/api/v1/authors/{id}/feed", authorId).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Members note","content":"secret","premiumOnly":true}"""))
                .andExpect(status().isCreated());
    }

    @Test
    void hobbyistPremiumPost_isVisibleToAnyone() throws Exception {
        registerAndGetToken("hobfeed", "hobfeed@example.com");
        long authorId = userIdOf("hobfeed@example.com");
        String adminToken = seedAdminAndGetToken("hobfeedadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author); // hobbyist, cannot monetize
        String author = relogin("hobfeed@example.com");
        postPremiumFeed(author, authorId);

        // a hobbyist cannot monetize, so their premium-flagged post is free to an anonymous viewer
        mvc.perform(get("/api/v1/authors/{id}/feed", authorId))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void professionalPremiumPost_isHiddenFromNonSubscribers() throws Exception {
        registerAndGetToken("profeed", "profeed@example.com");
        long authorId = userIdOf("profeed@example.com");
        String adminToken = seedAdminAndGetToken("profeedadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization); // professional, monetized
        String author = relogin("profeed@example.com");
        postPremiumFeed(author, authorId);

        // anonymous / non-subscribing readers do NOT see a monetized author's premium post
        mvc.perform(get("/api/v1/authors/{id}/feed", authorId))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        String outsider = registerAndGetToken("profeedreader", "profeedreader@example.com");
        mvc.perform(get("/api/v1/authors/{id}/feed", authorId).header("Authorization", bearer(outsider)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        // the author themselves still sees it
        mvc.perform(get("/api/v1/authors/{id}/feed", authorId).header("Authorization", bearer(author)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    }
}
