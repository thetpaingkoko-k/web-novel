package com.webnovel.engagement;

import static org.hamcrest.Matchers.hasSize;
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

/** Engagement end to end (FR-5/8/10): view dedup, likes, and the spoiler-safe comment gate. */
class EngagementIT extends AuthTestSupport {

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

        // reader comments on the chapter
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
}
