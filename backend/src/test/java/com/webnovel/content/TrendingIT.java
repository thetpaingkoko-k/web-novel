package com.webnovel.content;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
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
 * §5: the home "trending" carousel ranks non-draft, non-hidden books by a weighted score
 * over views, likes, and comments. A like counts for more than a passive view, so a
 * liked book outranks a merely-viewed one; drafts never appear.
 */
class TrendingIT extends AuthTestSupport {

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

    /** Creates a book (optionally left as draft) and returns its id. */
    private long createBook(String author, String title, String status) throws Exception {
        String body = mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"status\":\"" + status + "\",\"isPremium\":false}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookId").asLong();
    }

    /** Adds and publishes one chapter to a book, returning the chapter id. */
    private long publishChapter(String author, long bookId) throws Exception {
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
    void trending_ranksLikedBookAheadOfViewedBook_andExcludesDrafts() throws Exception {
        registerAndGetToken("trendauthor", "trendauthor@example.com");
        long authorId = userIdOf("trendauthor@example.com");
        String adminToken = seedAdminAndGetToken("trendadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization); // professional → direct publish
        String author = relogin("trendauthor@example.com");

        // "Viewed" only picks up a passive view; "Liked" picks up a deliberate like (weighted higher).
        long viewedId = createBook(author, "Viewed Tale", "ongoing");
        long viewedChapter = publishChapter(author, viewedId);
        long likedId = createBook(author, "Liked Tale", "ongoing");
        long likedChapter = publishChapter(author, likedId);
        // A draft must never surface on the carousel.
        long draftId = createBook(author, "Draft Tale", "draft");

        // One anonymous view for the viewed book (score = 1 * viewWeight).
        mvc.perform(post("/api/v1/books/{id}/view", viewedId).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionId":"v1","deviceFingerprint":"v1d"}"""))
                .andExpect(status().isOk());
        // One like for the liked book (score = 1 * likeWeight, which outweighs a single view).
        String reader = registerAndGetToken("trendreader", "trendreader@example.com");
        mvc.perform(post("/api/v1/chapters/{id}/like", likedChapter).header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.liked", is(true)));

        // Anonymous read of the carousel: liked book first, viewed book present, draft absent.
        mvc.perform(get("/api/v1/books/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].bookId", is((int) likedId)))
                .andExpect(jsonPath("$[0].likeCount", is(1)))
                .andExpect(jsonPath("$[*].bookId", hasItem((int) viewedId)))
                .andExpect(jsonPath("$[*].bookId", everyItem(not(is((int) draftId)))));

        // Keep the unused chapter id referenced so the intent (a published chapter exists) is clear.
        org.junit.jupiter.api.Assertions.assertTrue(viewedChapter > 0);
    }
}
