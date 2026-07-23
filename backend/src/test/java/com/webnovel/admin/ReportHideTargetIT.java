package com.webnovel.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.domain.enums.CommentStatus;
import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.ChapterCommentRepository;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/**
 * Report target hide/unhide (FR-12.3). The reversible {@code hidden} flag on books plus the
 * comment/debate-post hide path, and the public-visibility consequences of hiding a book.
 */
class ReportHideTargetIT extends AuthTestSupport {

    @Autowired BookRepository books;
    @Autowired ChapterCommentRepository comments;

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

    private String authorTokenFor(String username, String email, String adminToken) throws Exception {
        registerAndGetToken(username, email);
        approve(adminToken, userIdOf(email), ApproveRequest.Kind.verify_author);
        return relogin(email);
    }

    private long createBook(String authorToken, String title) throws Exception {
        String book = mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"status\":\"ongoing\",\"isPremium\":false}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(book).get("bookId").asLong();
    }

    private long fileReport(String reporterToken, String targetType, long targetId) throws Exception {
        String created = mvc.perform(post("/api/v1/reports").header("Authorization", bearer(reporterToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetType\":\"" + targetType + "\",\"targetId\":" + targetId
                                + ",\"reason\":\"bad\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).get("reportId").asLong();
    }

    /** hide-target on a book sets hidden=true / status action_taken; unhide reverts to hidden=false / pending. */
    @Test
    void hideAndUnhide_bookReport_togglesHiddenAndReportStatus() throws Exception {
        String adminToken = seedAdminAndGetToken("htbookadmin@webnovel.local");
        String author = authorTokenFor("htbookauthor", "htbookauthor@example.com", adminToken);
        long bookId = createBook(author, "Hideable Tome");
        String reporter = registerAndGetToken("htbookreporter", "htbookreporter@example.com");
        long reportId = fileReport(reporter, "book", bookId);

        // hide → book hidden=true, report action_taken
        mvc.perform(put("/api/v1/admin/reports/{id}/hide-target", reportId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("action_taken")))
                .andExpect(jsonPath("$.targetId", is((int) bookId)));
        assertThat(books.findById(bookId).orElseThrow().isHidden()).isTrue();

        // unhide → book hidden=false, report back to pending
        mvc.perform(put("/api/v1/admin/reports/{id}/unhide-target", reportId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("pending")));
        assertThat(books.findById(bookId).orElseThrow().isHidden()).isFalse();

        // clean up the shared pending queue for sibling tests
        mvc.perform(put("/api/v1/admin/reports/{id}/resolve", reportId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"dismissed\"}"))
                .andExpect(status().isOk());
    }

    /** A hidden book disappears from public browse and 404s on public detail, but admin & owner still see it. */
    @Test
    void hiddenBook_isHiddenFromPublic_butVisibleToAdminAndOwner() throws Exception {
        String adminToken = seedAdminAndGetToken("htvisadmin@webnovel.local");
        String author = authorTokenFor("htvisauthor", "htvisauthor@example.com", adminToken);
        long bookId = createBook(author, "Vanishing Saga");
        String reporter = registerAndGetToken("htvisreporter", "htvisreporter@example.com");
        long reportId = fileReport(reporter, "book", bookId);

        // visible in public browse-by-title before hiding
        mvc.perform(get("/api/v1/books?search=Vanishing Saga"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.bookId == %d)]".formatted(bookId), hasSize(1)));

        mvc.perform(put("/api/v1/admin/reports/{id}/hide-target", reportId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());

        // excluded from public browse
        mvc.perform(get("/api/v1/books?search=Vanishing Saga"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.bookId == %d)]".formatted(bookId), hasSize(0)));
        // public detail 404s
        mvc.perform(get("/api/v1/books/{id}", bookId))
                .andExpect(status().isNotFound());
        // admin still sees it, with hidden=true reflected
        mvc.perform(get("/api/v1/books/{id}", bookId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hidden", is(true)));
        // owner still sees it on their dashboard
        mvc.perform(get("/api/v1/books/{id}", bookId).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hidden", is(true)));

        // unhide restores public visibility
        mvc.perform(put("/api/v1/admin/reports/{id}/unhide-target", reportId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/books/{id}", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hidden", is(false)));

        mvc.perform(put("/api/v1/admin/reports/{id}/resolve", reportId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"dismissed\"}"))
                .andExpect(status().isOk());
    }

    /** hide-target on a chapter-comment report sets the comment status to hidden; unhide restores it. */
    @Test
    void hideAndUnhide_commentReport_togglesCommentStatus() throws Exception {
        String adminToken = seedAdminAndGetToken("htcmtadmin@webnovel.local");
        String author = authorTokenFor("htcmtauthor", "htcmtauthor@example.com", adminToken);
        long bookId = createBook(author, "Comment Book");
        String ch = mvc.perform(post("/api/v1/books/{b}/chapters", bookId).header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chapterNumber\":1,\"title\":\"Ch1\",\"content\":\"body\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long chapterId = objectMapper.readTree(ch).get("chapterId").asLong();
        mvc.perform(post("/api/v1/chapters/{id}/publish", chapterId).header("Authorization", bearer(author)))
                .andExpect(status().isOk());

        String reader = registerAndGetToken("htcmtreader", "htcmtreader@example.com");
        // FR-8.2 comment gate: record a view before commenting
        mvc.perform(post("/api/v1/chapters/{id}/view", chapterId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"htcmtS\",\"deviceFingerprint\":\"htcmtSd\"}"))
                .andExpect(status().isOk());
        String cmt = mvc.perform(post("/api/v1/chapters/{id}/comments", chapterId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"spammy\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long commentId = objectMapper.readTree(cmt).get("commentId").asLong();

        String reporter = registerAndGetToken("htcmtreporter", "htcmtreporter@example.com");
        long reportId = fileReport(reporter, "chapter_comment", commentId);

        mvc.perform(put("/api/v1/admin/reports/{id}/hide-target", reportId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("action_taken")));
        assertThat(comments.findById(commentId).orElseThrow().getStatus()).isEqualTo(CommentStatus.hidden);

        mvc.perform(put("/api/v1/admin/reports/{id}/unhide-target", reportId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("pending")));
        assertThat(comments.findById(commentId).orElseThrow().getStatus()).isEqualTo(CommentStatus.visible);

        mvc.perform(put("/api/v1/admin/reports/{id}/resolve", reportId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"dismissed\"}"))
                .andExpect(status().isOk());
    }

    /** A report against a user account is not hideable → 400. */
    @Test
    void hideTarget_userReport_isRejected() throws Exception {
        String adminToken = seedAdminAndGetToken("htuseradmin@webnovel.local");
        String reporter = registerAndGetToken("htuserreporter", "htuserreporter@example.com");
        registerAndGetToken("htusertarget", "htusertarget@example.com");
        long targetUserId = userIdOf("htusertarget@example.com");
        long reportId = fileReport(reporter, "user", targetUserId);

        mvc.perform(put("/api/v1/admin/reports/{id}/hide-target", reportId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("validation_failed")));

        mvc.perform(put("/api/v1/admin/reports/{id}/resolve", reportId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"dismissed\"}"))
                .andExpect(status().isOk());
    }
}
