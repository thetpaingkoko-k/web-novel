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
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    /** Create a draft chapter (auto-numbered) and return its id. */
    private long createChapter(String author, long bookId, String title, String body) throws Exception {
        String ch = mvc.perform(post("/api/v1/books/{b}/chapters", bookId).header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"content\":\"" + body + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(ch).get("chapterId").asLong();
    }

    private void submit(String author, long chapterId) throws Exception {
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk());
    }

    /**
     * A rejected chapter keeps its stored number (so the author still sees it), but readers see a
     * gapless sequence: publishing the next chapter after a rejection must not leave a hole.
     */
    @Test
    void rejectedChapter_leavesNoGap_forReaders() throws Exception {
        registerAndGetToken("gaphobby", "gaphobby@example.com");
        long authorId = userIdOf("gaphobby@example.com");
        String adminToken = seedAdminAndGetToken("gapadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        String author = relogin("gaphobby@example.com");

        String book = mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Gap Tale","status":"ongoing","isPremium":false}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(book).get("bookId").asLong();

        // Ch1 → approved (stored #1).
        long ch1 = createChapter(author, bookId, "Ch1", "body one");
        submit(author, ch1);
        mvc.perform(put("/api/v1/admin/chapters/{id}/approve", ch1).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());

        // Ch2 → REJECTED (stored #2 lingers, held by the rejected row).
        long ch2 = createChapter(author, bookId, "Ch2", "body two");
        submit(author, ch2);
        mvc.perform(put("/api/v1/admin/chapters/{id}/reject", ch2).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"needs work\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("rejected")));

        // Ch3 → approved. Its stored number is 3 (max still counts the rejected #2).
        long ch3 = createChapter(author, bookId, "Ch3", "body three");
        submit(author, ch3);
        mvc.perform(put("/api/v1/admin/chapters/{id}/approve", ch3).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());

        // Reader: two published chapters, numbered 1 and 2 (no gap at the rejected slot).
        String reader = registerAndGetToken("gapreader", "gapreader@example.com");
        mvc.perform(get("/api/v1/books/{id}", bookId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chapters.length()", is(2)))
                .andExpect(jsonPath("$.chapters[0].chapterNumber", is(1)))
                .andExpect(jsonPath("$.chapters[1].chapterNumber", is(2)));

        // Reader opening the 2nd published chapter (stored #3) sees it as Chapter 2.
        mvc.perform(get("/api/v1/chapters/{id}", ch3).header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chapterNumber", is(2)));

        // The author (privileged) still sees the true stored number.
        mvc.perform(get("/api/v1/chapters/{id}", ch3).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chapterNumber", is(3)));
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
