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

    /** Create a chapter with an explicit number then publish it (professional → direct publish). */
    private long createAndPublish(String token, long bookId, int number) throws Exception {
        String body = mvc.perform(post("/api/v1/books/{b}/chapters", bookId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chapterNumber\":%d,\"title\":\"Ch%d\",\"content\":\"body %d\"}"
                                .formatted(number, number, number)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long chapterId = objectMapper.readTree(body).get("chapterId").asLong();
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("published")));
        return chapterId;
    }

    /**
     * CHANGE 6: the first 10% of a premium book's published chapters are a free preview.
     * With 3 published chapters, N = max(1, round(0.3)) = 1 — only chapter 1 is free.
     */
    @Test
    void premiumBook_firstTenPercent_isFreePreview() throws Exception {
        registerAndGetToken("prevauthor", "prevauthor@example.com");
        long authorId = userIdOf("prevauthor@example.com");
        String adminToken = seedAdminAndGetToken("prevadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("prevauthor@example.com");

        long bookId = createBook(author, """
                {"title":"Preview Saga","status":"ongoing","isPremium":true}""");
        // create+publish each in turn so a book never holds two drafts at once (CHANGE 1)
        long ch1 = createAndPublish(author, bookId, 1);
        long ch2 = createAndPublish(author, bookId, 2);
        createAndPublish(author, bookId, 3);

        // anonymous can read the preview chapter (ch1) → 200 with content and preview=true
        mvc.perform(get("/api/v1/chapters/{id}", ch1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", is("body 1")))
                .andExpect(jsonPath("$.preview", is(true)));

        // a non-subscriber reader also gets the preview chapter
        String reader = registerAndGetToken("prevreader", "prevreader@example.com");
        mvc.perform(get("/api/v1/chapters/{id}", ch1).header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preview", is(true)));

        // ch2 is beyond the preview range → still paywalled (403 no_subscription)
        mvc.perform(get("/api/v1/chapters/{id}", ch2))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("no_subscription")));
        mvc.perform(get("/api/v1/chapters/{id}", ch2).header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("no_subscription")));

        // the public book detail flags which chapter rows are previews
        mvc.perform(get("/api/v1/books/{id}", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chapters[0].preview", is(true)))
                .andExpect(jsonPath("$.chapters[1].preview", is(false)))
                .andExpect(jsonPath("$.chapters[2].preview", is(false)));
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
        // Publish two chapters: with 2 published, N = max(1, round(0.2)) = 1, so only ch1 is a
        // free preview and ch2 stays paywalled — assert the gate on ch2 (beyond the preview).
        createAndPublish(author, bookId, 1);
        long chapterId = createAndPublish(author, bookId, 2);

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

        // the author reads their own premium chapter → 200 with content (and preview=false for ch2)
        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", is("body 2")))
                .andExpect(jsonPath("$.preview", is(false)));
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
