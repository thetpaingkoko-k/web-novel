package com.webnovel.engagement;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Engagement end to end (FR-5/8/10): view dedup, likes, and the spoiler-safe comment gate. */
class EngagementIT extends AuthTestSupport {

    private void approve(String adminToken, long userId, ApproveRequest.Kind kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    /** Records a chapter view for the given (authenticated) reader — the comment gate (FR-8.2). */
    private void recordView(String token, long chapterId, String session) throws Exception {
        mvc.perform(post("/api/v1/chapters/{id}/view", chapterId).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"" + session + "\",\"deviceFingerprint\":\"" + session + "d\"}"))
                .andExpect(status().isOk());
    }

    private String relogin(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private long publishedFreeChapter(String author) throws Exception {
        String book = mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Engage","status":"ongoing","isPremium":false}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(book).get("bookId").asLong();
        String ch = mvc.perform(post("/api/v1/books/{b}/chapters", bookId).header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chapterNumber":1,"title":"Ch1","content":"body"}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long chapterId = objectMapper.readTree(ch).get("chapterId").asLong();
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("published")));
        return chapterId;
    }

    @Test
    void viewDedup_likes_andSpoilerSafeComments() throws Exception {
        registerAndGetToken("enauthor", "enauthor@example.com");
        long authorId = userIdOf("enauthor@example.com");
        String adminToken = seedAdminAndGetToken("enadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("enauthor@example.com");
        long chapterId = publishedFreeChapter(author);

        // first view is unique, a second view in the same session is not (§9.2)
        mvc.perform(post("/api/v1/chapters/{id}/view", chapterId).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionId":"s1","deviceFingerprint":"d1"}"""))
                .andExpect(status().isOk()).andExpect(jsonPath("$.unique", is(true)));
        mvc.perform(post("/api/v1/chapters/{id}/view", chapterId).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionId":"s1","deviceFingerprint":"d1"}"""))
                .andExpect(status().isOk()).andExpect(jsonPath("$.unique", is(false)));

        // likes are idempotent
        String reader = registerAndGetToken("enreader", "enreader@example.com");
        // before liking, the chapter read reports likedByMe=false (and false for anonymous)
        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likedByMe", is(false)));
        mvc.perform(post("/api/v1/chapters/{id}/like", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likeCount", is(1)))
                .andExpect(jsonPath("$.liked", is(true)));
        mvc.perform(post("/api/v1/chapters/{id}/like", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likeCount", is(1)));
        // after liking, the reader sees likedByMe=true; anonymous still sees false
        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likedByMe", is(true)));
        mvc.perform(get("/api/v1/chapters/{id}", chapterId))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likedByMe", is(false)));

        // a reader who has not read the chapter cannot discuss it (FR-8.2) → 403
        mvc.perform(post("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"too soon\"}"))
                .andExpect(status().isForbidden());

        // after recording a view of the chapter, the reader may comment (subscription NOT required)
        recordView(reader, chapterId, "enreaderS");
        mvc.perform(post("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Loved it\"}"))
                .andExpect(status().isCreated());

        // a fresh reader with no progress cannot see the comment (spoiler gate, FR-8.3)
        String reader2 = registerAndGetToken("enreader2", "enreader2@example.com");
        mvc.perform(get("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));

        // after reporting completion of the chapter, the comment becomes visible
        long bookId = objectMapper.readTree(
                        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(reader2)))
                                .andReturn().getResponse().getContentAsString())
                .get("bookId").asLong();
        mvc.perform(put("/api/v1/books/{id}/progress", bookId).header("Authorization", bearer(reader2))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"chapterId\":" + chapterId + "}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].content", is("Loved it")));
    }

    /** §4: an author may soft-delete their own comment; the removed node stays in the thread. */
    @Test
    void deleteOwnComment_softDeletes_keepingThreadWithRemovedStatus() throws Exception {
        registerAndGetToken("delauthor", "delauthor@example.com");
        long authorId = userIdOf("delauthor@example.com");
        String adminToken = seedAdminAndGetToken("deladmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization); // professional → direct publish
        String author = relogin("delauthor@example.com");
        long chapterId = publishedFreeChapter(author);

        String reader = registerAndGetToken("delreader", "delreader@example.com");
        long bookId = objectMapper.readTree(
                        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(reader)))
                                .andReturn().getResponse().getContentAsString())
                .get("bookId").asLong();
        // read the chapter so the spoiler gate lets the commenter see the thread
        mvc.perform(put("/api/v1/books/{id}/progress", bookId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"chapterId\":" + chapterId + "}"))
                .andExpect(status().isOk());

        recordView(reader, chapterId, "delreaderS"); // FR-8.2 comment gate: must have read it
        String commentBody = mvc.perform(post("/api/v1/chapters/{id}/comments", chapterId)
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"to be deleted\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long commentId = objectMapper.readTree(commentBody).get("commentId").asLong();

        // a different authenticated user cannot delete it → 403
        String other = registerAndGetToken("delother", "delother@example.com");
        mvc.perform(delete("/api/v1/comments/{id}", commentId).header("Authorization", bearer(other)))
                .andExpect(status().isForbidden());

        // deleting a non-existent comment → 404
        mvc.perform(delete("/api/v1/comments/{id}", 999999L).header("Authorization", bearer(reader)))
                .andExpect(status().isNotFound());

        // the comment's author soft-deletes it → 204
        mvc.perform(delete("/api/v1/comments/{id}", commentId).header("Authorization", bearer(reader)))
                .andExpect(status().isNoContent());

        // the node is still returned (thread intact) with status = removed
        mvc.perform(get("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].commentId", is((int) commentId)))
                .andExpect(jsonPath("$[0].status", is("removed")));
    }

    /** FR-13.6: an admin may hide and later restore a comment; hidden comments drop out of the thread. */
    @Test
    void adminHideAndUnhideComment() throws Exception {
        registerAndGetToken("hideauthor", "hideauthor@example.com");
        long authorId = userIdOf("hideauthor@example.com");
        String adminToken = seedAdminAndGetToken("hideadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("hideauthor@example.com");
        long chapterId = publishedFreeChapter(author);

        String reader = registerAndGetToken("hidereader", "hidereader@example.com");
        long bookId = objectMapper.readTree(
                        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(reader)))
                                .andReturn().getResponse().getContentAsString())
                .get("bookId").asLong();
        mvc.perform(put("/api/v1/books/{id}/progress", bookId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"chapterId\":" + chapterId + "}"))
                .andExpect(status().isOk());

        recordView(reader, chapterId, "hidereaderS"); // FR-8.2 comment gate: must have read it
        String commentBody = mvc.perform(post("/api/v1/chapters/{id}/comments", chapterId)
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"spammy\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long commentId = objectMapper.readTree(commentBody).get("commentId").asLong();

        // a non-admin cannot hide → 403
        mvc.perform(put("/api/v1/admin/comments/{id}/hide", commentId).header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());

        // admin hides it → 200 with status = hidden
        mvc.perform(put("/api/v1/admin/comments/{id}/hide", commentId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentId", is((int) commentId)))
                .andExpect(jsonPath("$.status", is("hidden")));

        // hidden comments drop out of the non-privileged reader's thread view
        mvc.perform(get("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));

        // but an admin (privileged) still sees the hidden comment in the thread
        mvc.perform(get("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].commentId", is((int) commentId)))
                .andExpect(jsonPath("$[0].status", is("hidden")));

        // hiding a non-existent comment → 404
        mvc.perform(put("/api/v1/admin/comments/{id}/hide", 999999L).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNotFound());

        // admin restores it → status = visible and it reappears in the thread
        mvc.perform(put("/api/v1/admin/comments/{id}/unhide", commentId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("visible")));
        mvc.perform(get("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    }
}
