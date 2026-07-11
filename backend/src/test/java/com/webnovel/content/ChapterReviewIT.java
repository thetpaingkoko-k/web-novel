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

/**
 * Hobbyist review flow (FR-3.1/3.3) and the admin-review contract: admins read a
 * pending_review chapter's full content via {@code GET /api/v1/chapters/{id}}
 * (the queue rows stay light), while it stays hidden from readers.
 */
class ChapterReviewIT extends AuthTestSupport {

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
    void pendingChapter_isReadableByAdminViaChapterRead_hiddenFromReaders_thenApproved() throws Exception {
        registerAndGetToken("revhobby", "revhobby@example.com");
        long authorId = userIdOf("revhobby@example.com");
        String adminToken = seedAdminAndGetToken("revadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author); // hobbyist only
        String author = relogin("revhobby@example.com");

        String book = mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Review Tale","status":"ongoing","isPremium":false}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(book).get("bookId").asLong();

        String ch = mvc.perform(post("/api/v1/books/{b}/chapters", bookId).header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chapterNumber":1,"title":"Ch1","content":"secret pending body"}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long chapterId = objectMapper.readTree(ch).get("chapterId").asLong();

        // hobbyist publish → pending_review (§9.5)
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("pending_review")));

        // queue lists it
        mvc.perform(get("/api/v1/admin/chapters").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.chapterId == " + chapterId + ")].authorUsername",
                        is(java.util.List.of("revhobby"))));

        // admin reads the full pending content through the chapter-read endpoint
        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("pending_review")))
                .andExpect(jsonPath("$.content", is("secret pending body")))
                .andExpect(jsonPath("$.likedByMe", is(false)));

        // a regular reader (and anonymous) cannot see the pending chapter
        String reader = registerAndGetToken("revreader", "revreader@example.com");
        mvc.perform(get("/api/v1/chapters/{id}", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/chapters/{id}", chapterId))
                .andExpect(status().isNotFound());

        // a non-admin cannot approve
        mvc.perform(put("/api/v1/admin/chapters/{id}/approve", chapterId).header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());

        // approve → published; review responses report likedByMe=false
        mvc.perform(put("/api/v1/admin/chapters/{id}/approve", chapterId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("published")))
                .andExpect(jsonPath("$.likedByMe", is(false)));
    }
}
