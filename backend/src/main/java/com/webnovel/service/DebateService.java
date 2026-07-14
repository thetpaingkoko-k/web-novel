package com.webnovel.service;

import com.webnovel.domain.entity.DebatePost;
import com.webnovel.domain.entity.DebateThread;
import com.webnovel.domain.entity.DebateVote;
import com.webnovel.domain.enums.CommentStatus;
import com.webnovel.domain.enums.ThreadStatus;
import com.webnovel.domain.enums.VoteType;
import com.webnovel.dto.debate.CreatePostRequest;
import com.webnovel.dto.debate.CreateThreadRequest;
import com.webnovel.dto.debate.LockRequest;
import com.webnovel.dto.debate.PostResponse;
import com.webnovel.dto.debate.ThreadResponse;
import com.webnovel.dto.debate.VoteRequest;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.BookRepository;
import com.webnovel.repository.DebatePostRepository;
import com.webnovel.repository.DebateThreadRepository;
import com.webnovel.repository.DebateVoteRepository;
import com.webnovel.security.AppUserPrincipal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Rate-limited threaded debate engine (FR-9, §9.6). One thread per book per reader; 10/book/5 days. */
@Service
@RequiredArgsConstructor
public class DebateService {

    /** §14 configurable caps. */
    static final int MAX_THREADS_PER_WINDOW = 10;
    static final Duration WINDOW = Duration.ofDays(5);

    private final DebateThreadRepository threads;
    private final DebatePostRepository posts;
    private final DebateVoteRepository votes;
    private final BookRepository books;

    // --- threads ---

    @Transactional
    public ThreadResponse createThread(AppUserPrincipal reader, Long bookId, CreateThreadRequest req) {
        if (!books.existsById(bookId)) {
            throw new NotFoundException("book.not_found");
        }
        // Fast pre-check (the UNIQUE (book_id, creator_id) constraint is the DB backstop, FR-9.1).
        if (threads.existsByBookIdAndCreatorId(bookId, reader.getId())) {
            throw new ConflictException(ErrorCode.already_has_thread, "debate.already_has_thread");
        }
        // Serialize concurrent creations for this book so the window count can't be raced (§9.6).
        threads.acquireBookLock(bookId);
        long recent = threads.countByBookIdAndCreatedAtGreaterThanEqual(
                bookId, OffsetDateTime.now().minus(WINDOW));
        if (recent >= MAX_THREADS_PER_WINDOW) {
            throw new ConflictException(ErrorCode.book_window_full, "debate.book_window_full");
        }
        DebateThread thread = new DebateThread();
        thread.setBookId(bookId);
        thread.setCreatorId(reader.getId());
        thread.setTitle(req.title());
        thread.setStatus(ThreadStatus.open);
        thread.setPostCount(0);
        thread.setCreatedAt(OffsetDateTime.now());
        threads.save(thread);
        return threads.findThreadView(thread.getId()).orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<ThreadResponse> listThreads(Long bookId) {
        return threads.findThreadsByBook(bookId);
    }

    @Transactional(readOnly = true)
    public ThreadResponse getThread(Long threadId) {
        return threads.findThreadView(threadId)
                .orElseThrow(() -> new NotFoundException("debate.thread_not_found"));
    }

    /** Lock/reopen — admin or the thread's own creator (FR-9.6). */
    @Transactional
    public ThreadResponse setStatus(AppUserPrincipal principal, Long threadId, LockRequest req) {
        DebateThread thread = threads.findById(threadId)
                .orElseThrow(() -> new NotFoundException("debate.thread_not_found"));
        if (!principal.isAdmin() && !thread.getCreatorId().equals(principal.getId())) {
            throw new ForbiddenException("error.forbidden");
        }
        thread.setStatus(req.status());
        return threads.findThreadView(threadId).orElseThrow();
    }

    // --- posts ---

    @Transactional
    public PostResponse addPost(AppUserPrincipal author, Long threadId, CreatePostRequest req) {
        DebateThread thread = threads.findById(threadId)
                .orElseThrow(() -> new NotFoundException("debate.thread_not_found"));
        if (thread.getStatus() != ThreadStatus.open) {
            throw new ConflictException("debate.thread_not_open");
        }
        if (req.parentPostId() != null && !posts.existsByIdAndThreadId(req.parentPostId(), threadId)) {
            throw new NotFoundException("debate.post_not_found");
        }
        DebatePost post = new DebatePost();
        post.setThreadId(threadId);
        post.setAuthorId(author.getId());
        post.setParentPostId(req.parentPostId());
        post.setContent(req.content());
        post.setStatus(CommentStatus.visible);
        post.setCreatedAt(OffsetDateTime.now());
        posts.save(post);
        thread.setPostCount(thread.getPostCount() + 1);
        return posts.findPostView(post.getId(), author.getId()).orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<PostResponse> listPosts(Long threadId, Optional<AppUserPrincipal> viewer) {
        if (!threads.existsById(threadId)) {
            throw new NotFoundException("debate.thread_not_found");
        }
        return posts.findPostsByThread(threadId, viewer.map(AppUserPrincipal::getId).orElse(null));
    }

    // --- votes (FR-9.5: one vote per post per reader; switch allowed) ---

    @Transactional
    public PostResponse vote(AppUserPrincipal reader, Long postId, VoteRequest req) {
        if (!posts.existsById(postId)) {
            throw new NotFoundException("debate.post_not_found");
        }
        Optional<DebateVote> existing = votes.findByPostIdAndReaderId(postId, reader.getId());
        if (existing.isEmpty()) {
            DebateVote vote = new DebateVote();
            vote.setPostId(postId);
            vote.setReaderId(reader.getId());
            vote.setVoteType(req.voteType());
            votes.save(vote);
            applyDelta(postId, req.voteType(), 1);
        } else {
            DebateVote vote = existing.get();
            if (vote.getVoteType() != req.voteType()) {
                applyDelta(postId, vote.getVoteType(), -1); // remove old direction
                applyDelta(postId, req.voteType(), 1);      // add new direction
                vote.setVoteType(req.voteType());
            }
        }
        return posts.findPostView(postId, reader.getId()).orElseThrow();
    }

    private void applyDelta(Long postId, VoteType type, int delta) {
        if (type == VoteType.up) {
            posts.addUpvotes(postId, delta);
        } else {
            posts.addDownvotes(postId, delta);
        }
    }
}
