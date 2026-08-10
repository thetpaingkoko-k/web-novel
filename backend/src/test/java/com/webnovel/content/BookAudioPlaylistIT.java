package com.webnovel.content;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
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
 * {@code GET /books/{id}/audio-playlist} (§4.1.1): only published chapters that carry
 * narration audio, in reader order, with the same premium gating the chapter reader uses.
 */
class BookAudioPlaylistIT extends AuthTestSupport {

    private void approve(String adminToken, long userId, ApproveRequest.Kind kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    private String relogin(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private long createBook(String token, String json) throws Exception {
        String body = mvc.perform(post("/api/v1/books").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookId").asLong();
    }

    /**
     * Creates and publishes one chapter (professional → direct publish). {@code audioUrl}
     * null means the chapter carries no narration, so it must not appear in the playlist.
     */
    private void publishChapter(String token, long bookId, int number, String audioUrl) throws Exception {
        String audio = audioUrl == null ? "null" : "\"" + audioUrl + "\"";
        String body = mvc.perform(post("/api/v1/books/{b}/chapters", bookId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chapterNumber":%d,"title":"Ch%d","content":"body %d","audioUrl":%s}"""
                                .formatted(number, number, number, audio)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long chapterId = objectMapper.readTree(body).get("chapterId").asLong();
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("published")));
    }

    @Test
    void freeBook_listsOnlyNarratedChapters_inOrder() throws Exception {
        registerAndGetToken("audiofree", "audiofree@example.com");
        long authorId = userIdOf("audiofree@example.com");
        String adminToken = seedAdminAndGetToken("audiofreeadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("audiofree@example.com");

        long bookId = createBook(author, """
                {"title":"Narrated Tales","status":"ongoing","isPremium":false}""");
        publishChapter(author, bookId, 1, "/uploads/audio/one.mp3");
        publishChapter(author, bookId, 2, null); // no narration → not a track
        publishChapter(author, bookId, 3, "/uploads/audio/three.mp3");

        // Anonymous readers get the full playlist for a free book.
        mvc.perform(get("/api/v1/books/{id}/audio-playlist", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].chapterNumber", is(1)))
                .andExpect(jsonPath("$[0].audioUrl", is("/uploads/audio/one.mp3")))
                .andExpect(jsonPath("$[0].locked", is(false)))
                // The reader-facing numbering is gapless, so chapter 3 is track 3 here
                // only because every chapter before it is published.
                .andExpect(jsonPath("$[1].chapterNumber", is(3)))
                .andExpect(jsonPath("$[1].audioUrl", is("/uploads/audio/three.mp3")));
    }

    @Test
    void premiumBook_locksNonPreviewTracks_forNonSubscribers() throws Exception {
        registerAndGetToken("audiopro", "audiopro@example.com");
        long authorId = userIdOf("audiopro@example.com");
        String adminToken = seedAdminAndGetToken("audioproadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("audiopro@example.com");

        long bookId = createBook(author, """
                {"title":"Premium Narration","status":"ongoing","isPremium":true}""");
        // With 3 published chapters the free preview is N = max(1, round(0.3)) = 1.
        publishChapter(author, bookId, 1, "/uploads/audio/p1.mp3");
        publishChapter(author, bookId, 2, "/uploads/audio/p2.mp3");
        publishChapter(author, bookId, 3, "/uploads/audio/p3.mp3");

        // Anonymous: the preview track plays, the rest are listed but carry no URL.
        mvc.perform(get("/api/v1/books/{id}/audio-playlist", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].locked", is(false)))
                .andExpect(jsonPath("$[0].audioUrl", is("/uploads/audio/p1.mp3")))
                .andExpect(jsonPath("$[1].locked", is(true)))
                .andExpect(jsonPath("$[1].audioUrl", is(nullValue())))
                // A locked track still identifies its chapter so the list mirrors the book page.
                .andExpect(jsonPath("$[1].title", is("Ch2")))
                .andExpect(jsonPath("$[2].locked", is(true)));

        // A signed-in reader without a subscription is gated the same way.
        String reader = registerAndGetToken("audioreader", "audioreader@example.com");
        mvc.perform(get("/api/v1/books/{id}/audio-playlist", bookId).header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1].locked", is(true)));

        // The book's own author bypasses the paywall entirely.
        mvc.perform(get("/api/v1/books/{id}/audio-playlist", bookId).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1].locked", is(false)))
                .andExpect(jsonPath("$[1].audioUrl", is("/uploads/audio/p2.mp3")));
    }

    @Test
    void draftChaptersAndMissingBooks_areNotServed() throws Exception {
        registerAndGetToken("audiodraft", "audiodraft@example.com");
        long authorId = userIdOf("audiodraft@example.com");
        String adminToken = seedAdminAndGetToken("audiodraftadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        String author = relogin("audiodraft@example.com");

        long bookId = createBook(author, """
                {"title":"Unfinished","status":"ongoing","isPremium":false}""");
        // Created but never published → no track, even for the author.
        mvc.perform(post("/api/v1/books/{b}/chapters", bookId).header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chapterNumber":1,"title":"Draft","content":"x","audioUrl":"/uploads/audio/d.mp3"}"""))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/books/{id}/audio-playlist", bookId).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mvc.perform(get("/api/v1/books/{id}/audio-playlist", 999_999))
                .andExpect(status().isNotFound());
    }
}
