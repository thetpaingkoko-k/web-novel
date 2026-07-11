package com.webnovel.content;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** Premium access control (§9.1/FR-4) and the hobbyist publish→review→published path (§9.5). */
class AccessControlIT extends AuthTestSupport {

    private void approve(String adminToken, long userId, ApproveRequest.Kind kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    private long createBook(String token, String json) throws Exception {
        String body = mvc.perform(post("/api/v1/books").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookId").asLong();
    }

    private long uploadChapter(String token, long bookId) throws Exception {
        String body = mvc.perform(post("/api/v1/books/{b}/chapters", bookId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chapterNumber":1,"title":"Ch1","content":"secret content"}"""))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("chapterId").asLong();
    }

    private String relogin(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    @Test
    void premiumChapter_deniesNonSubscriber_allowsOwner() throws Exception {
        registerAndGetToken("pauthor", "pauthor@example.com");
        long authorId = userIdOf("pauthor@example.com");
        String adminToken = seedAdminAndGetToken("acadmin1@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("pauthor@example.com");

        long bookId = createBook(author, """
                {"title":"Premium Saga","status":"ongoing","isPremium":true}""");
        long chapterId = uploadChapter(author, bookId);
        // professional publishes directly → published
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("published")));

        // anonymous → 403 no_subscription naming the author
        mvc.perform(get("/api/v1/chapters/{id}", chapterId))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("no_subscription")))
                .andExpect(jsonPath("$.details.authorId", is((int) authorId)));

        // a different reader without a subscription → 403 no_subscription
        String reader = registerAndGetToken("plainreader", "plainreader@example.com");
        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("no_subscription")));

        // the author reads their own premium chapter → 200 with content
        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", is("secret content")));
    }

    @Test
    void hobbyistChapter_entersReview_thenAdminApprove_makesItPublicallyReadable() throws Exception {
        registerAndGetToken("hby", "hby@example.com");
        long authorId = userIdOf("hby@example.com");
        String adminToken = seedAdminAndGetToken("acadmin2@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author); // hobbyist only
        String author = relogin("hby@example.com");

        long bookId = createBook(author, """
                {"title":"Free Tale","status":"ongoing","isPremium":false}""");
        long chapterId = uploadChapter(author, bookId);

        // hobbyist submit → pending_review
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("pending_review")));

        // anonymous cannot read an unpublished chapter → 404 (no leak)
        mvc.perform(get("/api/v1/chapters/{id}", chapterId)).andExpect(status().isNotFound());

        // admin approves → published
        ResultActions approved = mvc.perform(put("/api/v1/admin/chapters/{id}/approve", chapterId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("published")));

        // now anonymous can read the free published chapter → 200
        mvc.perform(get("/api/v1/chapters/{id}", chapterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", is("secret content")));

        // non-admin cannot hit the review queue → 403
        mvc.perform(get("/api/v1/admin/chapters").header("Authorization", bearer(author)))
                .andExpect(status().isForbidden());
    }
}
