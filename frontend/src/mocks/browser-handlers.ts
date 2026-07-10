// DEV-ONLY mock backend handlers for MSW's browser worker.
// Mirrors the API contract in PROJECT SPEC.md §10 closely enough to click
// through every screen. Not exhaustive validation — a stand-in, not a spec.

import { http, HttpResponse } from "msw"
import type { AuthUser } from "@/types/auth"
import type { Book } from "@/types/content"
import type { Withdrawal } from "@/types/earnings"
import type { AdminWallet } from "@/types/subscriptions"
import {
  authorBalance,
  books,
  chapters,
  chaptersForBook,
  comments,
  earnings,
  feedPosts,
  genId,
  posts,
  session,
  subscriptions,
  threads,
  users,
  wallets,
  withdrawals,
} from "./seed"

const BASE = "/api/v1"
const tokensFor = (user: AuthUser) => ({
  accessToken: `mock-access-${user.userId}`,
  refreshToken: `mock-refresh-${user.userId}`,
  user,
})

function currentUser(): AuthUser | null {
  return session.current
}

export const browserHandlers = [
  // ---- Auth ----
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string; password: string }
    const user = users.find((u) => u.email === email)
    if (!user) return HttpResponse.json({ message: "invalid_credentials" }, { status: 401 })
    const { password: _pw, ...safe } = user
    session.current = safe
    return HttpResponse.json(tokensFor(safe))
  }),
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { username: string; email: string }
    const user: AuthUser = {
      userId: genId(),
      username: body.username,
      email: body.email,
      role: "reader",
      status: "approved",
      isMonetizationEnabled: false,
    }
    users.push({ ...user, password: "" })
    session.current = user
    return HttpResponse.json(tokensFor(user))
  }),
  http.post(`${BASE}/auth/refresh`, () => {
    const user = currentUser()
    if (!user) return HttpResponse.json({ message: "no_session" }, { status: 401 })
    return HttpResponse.json(tokensFor(user))
  }),
  http.post(`${BASE}/auth/logout`, () => {
    session.current = null
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${BASE}/users/me`, () => {
    const user = currentUser()
    if (!user) return HttpResponse.json({ message: "unauthorized" }, { status: 401 })
    return HttpResponse.json(user)
  }),

  // ---- Authors ----
  http.get(`${BASE}/authors/:authorId`, ({ params }) => {
    const authorId = Number(params.authorId)
    const seeded = users.find((u) => u.userId === authorId)
    return HttpResponse.json({
      authorId,
      username: seeded?.username ?? "unknown_author",
      bio: "A storyteller on WebNovel.",
      careerStage: seeded?.role === "professional_author" ? "professional" : "hobbyist",
      isMonetizationEnabled: seeded?.isMonetizationEnabled ?? false,
      monthlySubscriptionPrice: 5000,
    })
  }),

  // ---- Books & chapters ----
  http.get(`${BASE}/books`, ({ request }) => {
    const url = new URL(request.url)
    const genre = url.searchParams.get("genre")
    const status = url.searchParams.get("status")
    const search = url.searchParams.get("search")?.toLowerCase()
    const authorId = url.searchParams.get("authorId")
    const list = books
      .filter((b) => (genre ? b.genre === genre : true))
      .filter((b) => (status ? b.status === status : true))
      .filter((b) => (search ? b.title.toLowerCase().includes(search) : true))
      .filter((b) => (authorId ? b.authorId === Number(authorId) : true))
      .map((b) => ({
        bookId: b.bookId,
        authorId: b.authorId,
        authorUsername: b.authorUsername,
        title: b.title,
        genre: b.genre,
        coverImageUrl: b.coverImageUrl,
        status: b.status,
        isPremium: b.isPremium,
        chapterCount: chaptersForBook(b.bookId).length,
      }))
    return HttpResponse.json(list)
  }),
  http.get(`${BASE}/books/:bookId`, ({ params }) => {
    const book = books.find((b) => b.bookId === Number(params.bookId))
    if (!book) return HttpResponse.json({ message: "not_found" }, { status: 404 })
    return HttpResponse.json({ ...book, chapters: chaptersForBook(book.bookId) })
  }),
  http.post(`${BASE}/books`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const user = currentUser()
    const book = {
      bookId: genId(),
      authorId: user?.userId ?? 0,
      authorUsername: user?.username ?? "you",
      title: String(body.title ?? "Untitled"),
      synopsis: (body.synopsis as string) || null,
      genre: (body.genre as string) || null,
      coverImageUrl: (body.coverImageUrl as string) || null,
      status: (body.status as Book["status"]) ?? "draft",
      isPremium: Boolean(body.isPremium),
      createdAt: new Date().toISOString(),
      chapters: [],
    }
    books.push(book as (typeof books)[number])
    return HttpResponse.json(book)
  }),
  http.put(`${BASE}/books/:bookId`, async ({ params, request }) => {
    const book = books.find((b) => b.bookId === Number(params.bookId))
    if (!book) return HttpResponse.json({ message: "not_found" }, { status: 404 })
    Object.assign(book, await request.json())
    return HttpResponse.json({ ...book, chapters: chaptersForBook(book.bookId) })
  }),
  http.get(`${BASE}/chapters/:chapterId`, ({ params }) => {
    const chapter = chapters.find((c) => c.chapterId === Number(params.chapterId))
    if (!chapter) return HttpResponse.json({ message: "not_found" }, { status: 404 })
    const book = books.find((b) => b.bookId === chapter.bookId)
    const user = currentUser()
    // Premium gate: chapter 1 of a premium book is a free sample; the rest need a sub.
    if (book?.isPremium && chapter.chapterNumber > 1) {
      const isOwnerOrAdmin = user && (user.userId === book.authorId || user.role === "admin")
      const hasSub = subscriptions.some(
        (s) => s.authorId === book.authorId && s.status === "active"
      )
      if (!isOwnerOrAdmin && !hasSub) {
        return HttpResponse.json(
          { reason: "no_subscription", authorId: book.authorId, authorUsername: book.authorUsername },
          { status: 403 }
        )
      }
    }
    return HttpResponse.json(chapter)
  }),
  http.post(`${BASE}/books/:bookId/chapters`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const chapter = {
      chapterId: genId(),
      bookId: Number(params.bookId),
      chapterNumber: Number(body.chapterNumber ?? 1),
      title: String(body.title ?? "Untitled"),
      content: String(body.content ?? ""),
      status: "draft" as const,
      likeCount: 0,
      uniqueViewCount: 0,
      completionCount: 0,
      publishedAt: null,
      rejectionReason: null,
      likedByMe: false,
    }
    chapters.push(chapter)
    return HttpResponse.json(chapter)
  }),
  http.put(`${BASE}/chapters/:chapterId`, async ({ params, request }) => {
    const chapter = chapters.find((c) => c.chapterId === Number(params.chapterId))
    if (!chapter) return HttpResponse.json({ message: "not_found" }, { status: 404 })
    Object.assign(chapter, await request.json())
    return HttpResponse.json(chapter)
  }),
  http.post(`${BASE}/chapters/:chapterId/publish`, ({ params }) => {
    const chapter = chapters.find((c) => c.chapterId === Number(params.chapterId))
    if (!chapter) return HttpResponse.json({ message: "not_found" }, { status: 404 })
    const user = currentUser()
    // Professional authors publish directly; everyone else enters review.
    chapter.status = user?.role === "professional_author" ? "published" : "pending_review"
    chapter.publishedAt = chapter.status === "published" ? new Date().toISOString() : null
    return HttpResponse.json(chapter)
  }),
  http.post(`${BASE}/chapters/:chapterId/view`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/chapters/:chapterId/like`, ({ params }) => {
    const chapter = chapters.find((c) => c.chapterId === Number(params.chapterId))
    if (chapter && !chapter.likedByMe) {
      chapter.likedByMe = true
      chapter.likeCount += 1
    }
    return new HttpResponse(null, { status: 204 })
  }),
  http.delete(`${BASE}/chapters/:chapterId/like`, ({ params }) => {
    const chapter = chapters.find((c) => c.chapterId === Number(params.chapterId))
    if (chapter && chapter.likedByMe) {
      chapter.likedByMe = false
      chapter.likeCount = Math.max(0, chapter.likeCount - 1)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ---- Comments ----
  http.get(`${BASE}/chapters/:chapterId/comments`, ({ params }) =>
    HttpResponse.json(comments.filter((c) => c.chapterId === Number(params.chapterId)))
  ),
  http.post(`${BASE}/chapters/:chapterId/comments`, async ({ params, request }) => {
    const body = (await request.json()) as { content: string; parentCommentId?: number }
    const user = currentUser()
    const comment = {
      commentId: genId(),
      chapterId: Number(params.chapterId),
      readerId: user?.userId ?? 0,
      readerUsername: user?.username ?? "you",
      parentCommentId: body.parentCommentId ?? null,
      content: body.content,
      isSpoilerFlagged: false,
      status: "visible" as const,
      createdAt: new Date().toISOString(),
    }
    comments.push(comment)
    return HttpResponse.json(comment)
  }),

  // ---- Reading progress ----
  http.get(`${BASE}/books/:bookId/progress`, () => HttpResponse.json({ lastChapterReadId: null })),
  http.put(`${BASE}/books/:bookId/progress`, async ({ request }) => {
    const body = (await request.json()) as { lastChapterReadId: number }
    return HttpResponse.json({ lastChapterReadId: body.lastChapterReadId })
  }),

  // ---- Debates ----
  http.get(`${BASE}/books/:bookId/debates`, ({ params }) =>
    HttpResponse.json(threads.filter((t) => t.bookId === Number(params.bookId)))
  ),
  http.post(`${BASE}/books/:bookId/debates`, async ({ params, request }) => {
    const body = (await request.json()) as { title: string }
    const user = currentUser()
    const bookId = Number(params.bookId)
    if (user && threads.some((t) => t.bookId === bookId && t.creatorId === user.userId)) {
      return HttpResponse.json({ reason: "already_has_thread" }, { status: 409 })
    }
    const thread = {
      threadId: genId(),
      bookId,
      creatorId: user?.userId ?? 0,
      creatorUsername: user?.username ?? "you",
      title: body.title,
      status: "open" as const,
      postCount: 0,
      createdAt: new Date().toISOString(),
    }
    threads.push(thread)
    return HttpResponse.json(thread)
  }),
  http.get(`${BASE}/debates/:threadId/posts`, ({ params }) =>
    HttpResponse.json(posts.filter((p) => p.threadId === Number(params.threadId)))
  ),
  http.post(`${BASE}/debates/:threadId/posts`, async ({ params, request }) => {
    const body = (await request.json()) as { content: string; parentPostId?: number }
    const user = currentUser()
    const post = {
      postId: genId(),
      threadId: Number(params.threadId),
      authorId: user?.userId ?? 0,
      authorUsername: user?.username ?? "you",
      parentPostId: body.parentPostId ?? null,
      content: body.content,
      upvoteCount: 0,
      downvoteCount: 0,
      status: "visible" as const,
      createdAt: new Date().toISOString(),
      myVote: null,
    }
    posts.push(post)
    return HttpResponse.json(post)
  }),
  http.post(`${BASE}/posts/:postId/vote`, async ({ params, request }) => {
    const body = (await request.json()) as { voteType: "up" | "down" }
    const post = posts.find((p) => p.postId === Number(params.postId))
    if (post) {
      if (post.myVote === "up") post.upvoteCount -= 1
      if (post.myVote === "down") post.downvoteCount -= 1
      if (post.myVote === body.voteType) {
        post.myVote = null
      } else {
        post.myVote = body.voteType
        if (body.voteType === "up") post.upvoteCount += 1
        else post.downvoteCount += 1
      }
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ---- Feed ----
  http.get(`${BASE}/authors/:authorId/feed`, ({ params }) =>
    HttpResponse.json(feedPosts.filter((p) => p.authorId === Number(params.authorId)))
  ),
  http.post(`${BASE}/authors/:authorId/feed`, async ({ params, request }) => {
    const body = (await request.json()) as { title: string; content: string; isPremiumOnly: boolean }
    const post = {
      feedPostId: genId(),
      authorId: Number(params.authorId),
      title: body.title,
      content: body.content,
      isPremiumOnly: body.isPremiumOnly,
      publishedAt: new Date().toISOString(),
    }
    feedPosts.unshift(post)
    return HttpResponse.json(post)
  }),

  // ---- Subscriptions & payments ----
  http.get(`${BASE}/wallets/active`, () => {
    const active = wallets.find((w) => w.isActive)
    return active
      ? HttpResponse.json(active)
      : HttpResponse.json({ message: "no_active_wallet" }, { status: 404 })
  }),
  http.get(`${BASE}/subscriptions/me`, () => HttpResponse.json(subscriptions)),
  http.post(`${BASE}/authors/:authorId/payment-submissions`, ({ params }) => {
    const user = currentUser()
    const authorId = Number(params.authorId)
    const author = users.find((u) => u.userId === authorId)
    // Create a pending subscription so "My Subscriptions" reflects the request.
    subscriptions.push({
      subscriptionId: genId(),
      authorId,
      authorUsername: author?.username ?? "author",
      status: "pending_payment",
      startDate: null,
      endDate: null,
      priceMmk: 5000,
    })
    void user
    return HttpResponse.json({ submissionId: genId(), status: "pending" })
  }),

  // ---- Earnings & withdrawals ----
  http.get(`${BASE}/authors/:authorId/balance`, () => HttpResponse.json(authorBalance)),
  http.get(`${BASE}/authors/:authorId/earnings`, () => HttpResponse.json(earnings)),
  http.get(`${BASE}/authors/:authorId/withdrawals`, () => HttpResponse.json(withdrawals)),
  http.post(`${BASE}/authors/:authorId/withdrawals`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const withdrawal = {
      withdrawalId: genId(),
      amount: Number(body.amount ?? 0),
      payoutWalletProvider: body.payoutWalletProvider as Withdrawal["payoutWalletProvider"],
      payoutWalletNumber: String(body.payoutWalletNumber ?? ""),
      status: "pending" as const,
      requestedAt: new Date().toISOString(),
      paidAt: null,
      rejectionReason: null,
    }
    withdrawals.unshift(withdrawal)
    authorBalance.availableBalance = Math.max(0, authorBalance.availableBalance - withdrawal.amount)
    return HttpResponse.json(withdrawal)
  }),

  // ---- Reports ----
  http.post(`${BASE}/reports`, () => HttpResponse.json({ reportId: genId() })),
  http.get(`${BASE}/admin/reports`, () => HttpResponse.json([])),
  http.put(`${BASE}/admin/reports/:id/resolve`, () => new HttpResponse(null, { status: 204 })),

  // ---- Admin queues (empty by default; enough to render the dashboard) ----
  http.get(`${BASE}/admin/users`, () => HttpResponse.json([])),
  http.put(`${BASE}/admin/users/:id/approve`, () => new HttpResponse(null, { status: 204 })),
  http.put(`${BASE}/admin/users/:id/suspend`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/admin/chapters`, () =>
    HttpResponse.json(
      chapters
        .filter((c) => c.status === "pending_review")
        .map((c) => {
          const book = books.find((b) => b.bookId === c.bookId)
          return {
            chapterId: c.chapterId,
            bookId: c.bookId,
            bookTitle: book?.title ?? "",
            authorUsername: book?.authorUsername ?? "",
            chapterNumber: c.chapterNumber,
            title: c.title,
            content: c.content,
            submittedAt: c.publishedAt,
          }
        })
    )
  ),
  http.put(`${BASE}/admin/chapters/:id/approve`, ({ params }) => {
    const chapter = chapters.find((c) => c.chapterId === Number(params.id))
    if (chapter) {
      chapter.status = "published"
      chapter.publishedAt = new Date().toISOString()
    }
    return new HttpResponse(null, { status: 204 })
  }),
  http.put(`${BASE}/admin/chapters/:id/reject`, async ({ params, request }) => {
    const chapter = chapters.find((c) => c.chapterId === Number(params.id))
    const body = (await request.json()) as { rejectionReason: string }
    if (chapter) {
      chapter.status = "rejected"
      chapter.rejectionReason = body.rejectionReason
    }
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${BASE}/admin/payment-submissions`, () => HttpResponse.json([])),
  http.put(`${BASE}/admin/payment-submissions/:id/approve`, () => new HttpResponse(null, { status: 204 })),
  http.put(`${BASE}/admin/payment-submissions/:id/reject`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/admin/withdrawals`, () => HttpResponse.json([])),
  http.put(`${BASE}/admin/withdrawals/:id/mark-paid`, () => new HttpResponse(null, { status: 204 })),
  http.put(`${BASE}/admin/withdrawals/:id/reject`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/admin/wallets`, () => HttpResponse.json(wallets)),
  http.post(`${BASE}/admin/wallets`, async ({ request }) => {
    const body = (await request.json()) as { provider: AdminWallet["provider"]; walletNumber: string }
    wallets.push({ walletId: genId(), provider: body.provider, walletNumber: body.walletNumber, isActive: true })
    return new HttpResponse(null, { status: 201 })
  }),
  http.put(`${BASE}/admin/wallets/:id/deactivate`, ({ params }) => {
    const wallet = wallets.find((w) => w.walletId === Number(params.id))
    if (wallet) wallet.isActive = false
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${BASE}/admin/actions`, () => HttpResponse.json([])),
]
