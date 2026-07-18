package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.DebatePost;
import com.webnovel.domain.entity.DebateThread;
import com.webnovel.domain.entity.DebateVote;
import com.webnovel.domain.enums.CommentStatus;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.ThreadStatus;
import com.webnovel.domain.enums.VoteType;
import com.webnovel.dto.debate.CreatePostRequest;
import com.webnovel.dto.debate.CreateThreadRequest;
import com.webnovel.dto.debate.PostResponse;
import com.webnovel.dto.debate.ThreadResponse;
import com.webnovel.dto.debate.VoteRequest;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.DebatePostRepository;
import com.webnovel.repository.DebateThreadRepository;
import com.webnovel.repository.DebateVoteRepository;
import com.webnovel.security.AppUserPrincipal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** §9.6 debate thread creation: one-per-book and 10-per-5-days caps. */
@ExtendWith(MockitoExtension.class)
class DebateServiceTest {

    @Mock DebateThreadRepository threads;
    @Mock DebatePostRepository posts;
    @Mock DebateVoteRepository votes;
    @Mock BookRepository books;
    @Mock AccessControlService accessControl;
    @InjectMocks DebateService service;

    private final AppUserPrincipal reader = new AppUserPrincipal(7L, "reader", Role.reader, false);
    private final AppUserPrincipal admin = new AppUserPrincipal(1L, "admin", Role.admin, false);
    private final AppUserPrincipal bookAuthor = new AppUserPrincipal(20L, "author", Role.professional_author, false);

    private static Book book(long id, long authorId, boolean premium) {
        Book b = new Book();
        b.setId(id);
        b.setAuthorId(authorId);
        b.setPremium(premium);
        return b;
    }

    @Test
    void createThread_whenAdmin_isForbidden() {
        assertThatThrownBy(() -> service.createThread(admin, 1L, new CreateThreadRequest("Hi")))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.forbidden);
        verify(threads, never()).save(any());
        verify(threads, never()).existsByBookIdAndCreatorId(any(), any());
    }

    @Test
    void addPost_whenAdmin_isForbidden() {
        assertThatThrownBy(() -> service.addPost(admin, 5L, new CreatePostRequest("hello", null)))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.forbidden);
        verify(posts, never()).save(any());
        verify(threads, never()).findById(any());
    }

    @Test
    void createThread_whenReaderAlreadyHasOne_rejects() {
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, false)));
        when(threads.existsByBookIdAndCreatorId(1L, 7L)).thenReturn(true);

        assertThatThrownBy(() -> service.createThread(reader, 1L, new CreateThreadRequest("Hi")))
                .isInstanceOf(ConflictException.class)
                .extracting("code").isEqualTo(ErrorCode.already_has_thread);
        verify(threads, never()).save(any());
    }

    @Test
    void createThread_whenWindowFull_rejects() {
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, false)));
        when(threads.existsByBookIdAndCreatorId(1L, 7L)).thenReturn(false);
        when(threads.countByBookIdAndCreatedAtGreaterThanEqual(eq(1L), any(OffsetDateTime.class)))
                .thenReturn(10L);

        assertThatThrownBy(() -> service.createThread(reader, 1L, new CreateThreadRequest("Hi")))
                .isInstanceOf(ConflictException.class)
                .extracting("code").isEqualTo(ErrorCode.book_window_full);
        verify(threads).acquireBookLock(1L); // lock taken before the window count
        verify(threads, never()).save(any());
    }

    @Test
    void createThread_whenUnderCaps_creates() {
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, false)));
        when(threads.existsByBookIdAndCreatorId(1L, 7L)).thenReturn(false);
        when(threads.countByBookIdAndCreatedAtGreaterThanEqual(eq(1L), any(OffsetDateTime.class)))
                .thenReturn(3L);
        when(threads.save(any(DebateThread.class))).thenAnswer(i -> {
            DebateThread t = i.getArgument(0);
            t.setId(42L);
            return t;
        });
        when(threads.findThreadView(42L)).thenReturn(Optional.of(new ThreadResponse(
                42L, 1L, 7L, "reader", null, null, "Great book", ThreadStatus.open, 0, OffsetDateTime.now())));

        var res = service.createThread(reader, 1L, new CreateThreadRequest("Great book"));

        assertThat(res.threadId()).isEqualTo(42L);
        assertThat(res.creatorUsername()).isEqualTo("reader");
        assertThat(res.postCount()).isZero();
        verify(threads).acquireBookLock(1L);
    }

    // --- premium discussion gate (contract §1) ---

    @Test
    void createThread_premiumBook_nonSubscriber_isForbidden() {
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, true)));
        when(accessControl.hasActiveSubscription(7L, 20L)).thenReturn(false);

        assertThatThrownBy(() -> service.createThread(reader, 1L, new CreateThreadRequest("Hi")))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.no_subscription);
        verify(threads, never()).save(any());
        verify(threads, never()).acquireBookLock(anyLong());
    }

    @Test
    void createThread_premiumBook_subscriber_creates() {
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, true)));
        when(accessControl.hasActiveSubscription(7L, 20L)).thenReturn(true);
        when(threads.existsByBookIdAndCreatorId(1L, 7L)).thenReturn(false);
        when(threads.countByBookIdAndCreatedAtGreaterThanEqual(eq(1L), any(OffsetDateTime.class)))
                .thenReturn(0L);
        when(threads.save(any(DebateThread.class))).thenAnswer(i -> {
            DebateThread t = i.getArgument(0);
            t.setId(50L);
            return t;
        });
        when(threads.findThreadView(50L)).thenReturn(Optional.of(new ThreadResponse(
                50L, 1L, 7L, "reader", null, null, "Great book", ThreadStatus.open, 0, OffsetDateTime.now())));

        var res = service.createThread(reader, 1L, new CreateThreadRequest("Great book"));

        assertThat(res.threadId()).isEqualTo(50L);
        verify(threads).save(any(DebateThread.class));
    }

    @Test
    void createThread_premiumBook_bookAuthor_creates() {
        // The book's own author bypasses the subscription gate entirely.
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, true)));
        when(threads.existsByBookIdAndCreatorId(1L, 20L)).thenReturn(false);
        when(threads.countByBookIdAndCreatedAtGreaterThanEqual(eq(1L), any(OffsetDateTime.class)))
                .thenReturn(0L);
        when(threads.save(any(DebateThread.class))).thenAnswer(i -> {
            DebateThread t = i.getArgument(0);
            t.setId(51L);
            return t;
        });
        when(threads.findThreadView(51L)).thenReturn(Optional.of(new ThreadResponse(
                51L, 1L, 20L, "author", null, null, "Mine", ThreadStatus.open, 0, OffsetDateTime.now())));

        var res = service.createThread(bookAuthor, 1L, new CreateThreadRequest("Mine"));

        assertThat(res.threadId()).isEqualTo(51L);
        verify(accessControl, never()).hasActiveSubscription(any(), any());
    }

    @Test
    void addPost_premiumBook_nonSubscriber_isForbidden() {
        DebateThread thread = new DebateThread();
        thread.setId(5L);
        thread.setBookId(1L);
        thread.setStatus(ThreadStatus.open);
        when(threads.findById(5L)).thenReturn(Optional.of(thread));
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, true)));
        when(accessControl.hasActiveSubscription(7L, 20L)).thenReturn(false);

        assertThatThrownBy(() -> service.addPost(reader, 5L, new CreatePostRequest("hello", null)))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.no_subscription);
        verify(posts, never()).save(any());
    }

    @Test
    void addPost_premiumBook_subscriber_posts() {
        DebateThread thread = new DebateThread();
        thread.setId(5L);
        thread.setBookId(1L);
        thread.setStatus(ThreadStatus.open);
        thread.setPostCount(0);
        when(threads.findById(5L)).thenReturn(Optional.of(thread));
        when(books.findById(1L)).thenReturn(Optional.of(book(1L, 20L, true)));
        when(accessControl.hasActiveSubscription(7L, 20L)).thenReturn(true);
        when(posts.save(any(DebatePost.class))).thenAnswer(i -> {
            DebatePost p = i.getArgument(0);
            p.setId(88L);
            return p;
        });
        when(posts.findPostView(88L, 7L)).thenReturn(Optional.of(new PostResponse(
                88L, 5L, 7L, "reader", null, null, null, "hello", 0, 0,
                CommentStatus.visible, OffsetDateTime.now(), null)));

        var res = service.addPost(reader, 5L, new CreatePostRequest("hello", null));

        assertThat(res.postId()).isEqualTo(88L);
        assertThat(thread.getPostCount()).isEqualTo(1);
    }

    @Test
    void addPost_freeBook_nonSubscriber_posts() {
        DebateThread thread = new DebateThread();
        thread.setId(6L);
        thread.setBookId(2L);
        thread.setStatus(ThreadStatus.open);
        thread.setPostCount(0);
        when(threads.findById(6L)).thenReturn(Optional.of(thread));
        when(books.findById(2L)).thenReturn(Optional.of(book(2L, 20L, false)));
        when(posts.save(any(DebatePost.class))).thenAnswer(i -> {
            DebatePost p = i.getArgument(0);
            p.setId(90L);
            return p;
        });
        when(posts.findPostView(90L, 7L)).thenReturn(Optional.of(new PostResponse(
                90L, 6L, 7L, "reader", null, null, null, "hi", 0, 0,
                CommentStatus.visible, OffsetDateTime.now(), null)));

        var res = service.addPost(reader, 6L, new CreatePostRequest("hi", null));

        assertThat(res.postId()).isEqualTo(90L);
        verify(accessControl, never()).hasActiveSubscription(any(), any());
    }

    private static PostResponse postView(VoteType myVote, int up, int down) {
        return new PostResponse(88L, 5L, 7L, "reader", null, null, null, "hi",
                up, down, CommentStatus.visible, OffsetDateTime.now(), myVote);
    }

    /** Stubs post 88 in thread 5 with the given thread status, for the vote tests. */
    private void stubPostInThread(ThreadStatus status) {
        DebatePost post = new DebatePost();
        post.setId(88L);
        post.setThreadId(5L);
        when(posts.findById(88L)).thenReturn(Optional.of(post));
        DebateThread thread = new DebateThread();
        thread.setId(5L);
        thread.setStatus(status);
        when(threads.findById(5L)).thenReturn(Optional.of(thread));
    }

    @Test
    void vote_lockedThread_rejected() {
        stubPostInThread(ThreadStatus.locked);

        assertThatThrownBy(() -> service.vote(reader, 88L, new VoteRequest(VoteType.up)))
                .isInstanceOf(ConflictException.class);
        verify(votes, never()).save(any());
        verify(posts, never()).addUpvotes(any(), anyInt());
    }

    @Test
    void vote_firstTime_recordsVoteAndIncrements() {
        stubPostInThread(ThreadStatus.open);
        when(votes.findByPostIdAndReaderId(88L, 7L)).thenReturn(Optional.empty());
        when(posts.findPostView(88L, 7L)).thenReturn(Optional.of(postView(VoteType.up, 1, 0)));

        service.vote(reader, 88L, new VoteRequest(VoteType.up));

        verify(votes).save(any(DebateVote.class));
        verify(posts).addUpvotes(88L, 1);
        verify(posts, never()).addDownvotes(any(), anyInt());
    }

    @Test
    void vote_sameDirectionAgain_togglesOff() {
        DebateVote existing = new DebateVote();
        existing.setPostId(88L);
        existing.setReaderId(7L);
        existing.setVoteType(VoteType.up);
        stubPostInThread(ThreadStatus.open);
        when(votes.findByPostIdAndReaderId(88L, 7L)).thenReturn(Optional.of(existing));
        when(posts.findPostView(88L, 7L)).thenReturn(Optional.of(postView(null, 0, 0)));

        var res = service.vote(reader, 88L, new VoteRequest(VoteType.up));

        // the vote is removed and the upvote is decremented back
        verify(posts).addUpvotes(88L, -1);
        verify(votes).delete(existing);
        verify(votes, never()).save(any());
        assertThat(res.myVote()).isNull();
    }

    @Test
    void vote_oppositeDirection_switches() {
        DebateVote existing = new DebateVote();
        existing.setPostId(88L);
        existing.setReaderId(7L);
        existing.setVoteType(VoteType.up);
        stubPostInThread(ThreadStatus.open);
        when(votes.findByPostIdAndReaderId(88L, 7L)).thenReturn(Optional.of(existing));
        when(posts.findPostView(88L, 7L)).thenReturn(Optional.of(postView(VoteType.down, 0, 1)));

        service.vote(reader, 88L, new VoteRequest(VoteType.down));

        verify(posts).addUpvotes(88L, -1); // old direction removed
        verify(posts).addDownvotes(88L, 1); // new direction added
        verify(votes, never()).delete(any());
        assertThat(existing.getVoteType()).isEqualTo(VoteType.down);
    }
}
