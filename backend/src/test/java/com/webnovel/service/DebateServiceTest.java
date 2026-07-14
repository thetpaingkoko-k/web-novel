package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.DebateThread;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.ThreadStatus;
import com.webnovel.dto.debate.CreateThreadRequest;
import com.webnovel.dto.debate.ThreadResponse;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.ErrorCode;
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
    @InjectMocks DebateService service;

    private final AppUserPrincipal reader = new AppUserPrincipal(7L, "reader", Role.reader, false);

    @Test
    void createThread_whenReaderAlreadyHasOne_rejects() {
        when(books.existsById(1L)).thenReturn(true);
        when(threads.existsByBookIdAndCreatorId(1L, 7L)).thenReturn(true);

        assertThatThrownBy(() -> service.createThread(reader, 1L, new CreateThreadRequest("Hi")))
                .isInstanceOf(ConflictException.class)
                .extracting("code").isEqualTo(ErrorCode.already_has_thread);
        verify(threads, never()).save(any());
    }

    @Test
    void createThread_whenWindowFull_rejects() {
        when(books.existsById(1L)).thenReturn(true);
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
        when(books.existsById(1L)).thenReturn(true);
        when(threads.existsByBookIdAndCreatorId(1L, 7L)).thenReturn(false);
        when(threads.countByBookIdAndCreatedAtGreaterThanEqual(eq(1L), any(OffsetDateTime.class)))
                .thenReturn(3L);
        when(threads.save(any(DebateThread.class))).thenAnswer(i -> {
            DebateThread t = i.getArgument(0);
            t.setId(42L);
            return t;
        });
        when(threads.findThreadView(42L)).thenReturn(Optional.of(new ThreadResponse(
                42L, 1L, 7L, "reader", null, "Great book", ThreadStatus.open, 0, OffsetDateTime.now())));

        var res = service.createThread(reader, 1L, new CreateThreadRequest("Great book"));

        assertThat(res.threadId()).isEqualTo(42L);
        assertThat(res.creatorUsername()).isEqualTo("reader");
        assertThat(res.postCount()).isZero();
        verify(threads).acquireBookLock(1L);
    }
}
