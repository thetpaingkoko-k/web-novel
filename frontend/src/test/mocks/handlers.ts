import { http, HttpResponse } from "msw"
import type { Book, BookListItem } from "@/types/content"

/** Standard backend error body (mirrors ApiErrorBody). */
export function errorBody(code: string, message: string) {
  return { code, message, timestamp: new Date(0).toISOString() }
}

export const mockBookList: BookListItem[] = [
  {
    bookId: 1,
    authorUsername: "moonlight_writer",
    authorAvatarUrl: null,
    careerStage: "professional",
    title: "The Last Ember",
    genres: ["Fantasy"],
    coverImageUrl: null,
    status: "ongoing",
    isPremium: false,
    chapterCount: 3,
    readChaptersCount: null,
  },
]

export const mockBookDetail: Book = {
  bookId: 1,
  authorId: 10,
  authorUsername: "moonlight_writer",
  careerStage: "professional",
  title: "The Last Ember",
  synopsis: "A hobbyist tale of embers and ash.",
  genres: ["Fantasy"],
  coverImageUrl: null,
  status: "ongoing",
  isPremium: false,
  createdAt: new Date(0).toISOString(),
  viewCount: 128,
  bookmarkCount: 9,
  likeCount: 2,
  commentCount: 3,
  chapters: [
    {
      chapterId: 100,
      chapterNumber: 1,
      title: "Sparks",
      status: "published",
      likeCount: 2,
      uniqueViewCount: 10,
      completionCount: 6,
      publishedAt: new Date(0).toISOString(),
      preview: false,
    },
  ],
}

export const handlers = [
  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    if (body.email === "reader@example.com" && body.password === "password123") {
      return HttpResponse.json({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        user: {
          userId: 1,
          username: "reader1",
          email: body.email,
          role: "reader",
          status: "approved",
          isMonetizationEnabled: false,
        },
      })
    }
    return HttpResponse.json(errorBody("unauthorized", "Bad credentials"), { status: 401 })
  }),

  // Google Sign-In. idToken "collision" simulates rule B (email already a password
  // account → 409); any other token creates-or-logs-in and returns a token pair.
  http.post("/api/v1/auth/google", async ({ request }) => {
    const body = (await request.json()) as { idToken?: string }
    if (!body.idToken) {
      return HttpResponse.json(errorBody("validation_failed", "idToken required"), { status: 400 })
    }
    if (body.idToken === "collision") {
      return HttpResponse.json(
        errorBody("email_registered_with_password", "Already registered with a password"),
        { status: 409 }
      )
    }
    return HttpResponse.json({
      accessToken: "google-access-token",
      refreshToken: "google-refresh-token",
      user: {
        userId: 7,
        username: "googler",
        email: "googler@gmail.com",
        role: "reader",
        status: "approved",
        isMonetizationEnabled: false,
      },
    })
  }),

  // Manual signup → pending (202), no tokens. Verification comes next.
  http.post("/api/v1/auth/register", async ({ request }) => {
    const body = (await request.json()) as { email: string }
    return HttpResponse.json({ email: body.email, verificationRequired: true }, { status: 202 })
  }),

  // Verify code: "123456" succeeds (returns tokens), anything else is rejected.
  http.post("/api/v1/auth/verify-email", async ({ request }) => {
    const body = (await request.json()) as { email: string; code: string }
    if (body.code !== "123456") {
      return HttpResponse.json(
        errorBody("invalid_verification_code", "That code is incorrect or has expired"),
        { status: 400 }
      )
    }
    return HttpResponse.json({
      accessToken: "verified-access-token",
      refreshToken: "verified-refresh-token",
      user: {
        userId: 2,
        username: "verified",
        email: body.email,
        role: "reader",
        status: "approved",
        isMonetizationEnabled: false,
      },
    })
  }),

  // Resend: email "toosoon@example.com" hits the cooldown (429); otherwise 204.
  http.post("/api/v1/auth/resend-code", async ({ request }) => {
    const body = (await request.json()) as { email: string }
    if (body.email === "toosoon@example.com") {
      return HttpResponse.json(errorBody("resend_too_soon", "Please wait"), { status: 429 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get("/api/v1/books", () => HttpResponse.json(mockBookList)),
  http.get("/api/v1/books/:bookId", () => HttpResponse.json(mockBookDetail)),
  http.post("/api/v1/books/:bookId/view", () => HttpResponse.json({ unique: true })),

  // Bookmarks (Bearer auth). List rows mirror GET /books (readChaptersCount is
  // null here); writes are idempotent 204s with empty bodies.
  http.get("/api/v1/bookmarks/me", () => HttpResponse.json(mockBookList)),
  http.post("/api/v1/books/:bookId/bookmark", () => new HttpResponse(null, { status: 204 })),
  http.delete("/api/v1/books/:bookId/bookmark", () => new HttpResponse(null, { status: 204 })),

  http.get("/api/v1/authors/:authorId", () =>
    HttpResponse.json({
      authorId: 10,
      username: "moonlight_writer",
      avatarUrl: null,
      bio: "Writes about embers.",
      careerStage: "professional",
      isMonetizationEnabled: true,
      monthlySubscriptionPrice: 5000,
      subscriberCount: 42,
    })
  ),
  http.get("/api/v1/wallets/active", () =>
    HttpResponse.json({
      walletId: 1,
      provider: "KBZPay",
      walletNumber: "09123456789",
      accountName: "WebNovel Payments",
      isActive: true,
      qrImageUrl: null,
    })
  ),
  http.get("/api/v1/wallets", () =>
    HttpResponse.json([
      {
        walletId: 1,
        provider: "KBZPay",
        walletNumber: "09123456789",
        accountName: "WebNovel Payments",
        isActive: true,
        qrImageUrl: null,
      },
    ])
  ),
  http.get("/api/v1/subscriptions/me", () => HttpResponse.json([])),
  http.post("/api/v1/authors/:authorId/payment-submissions", () =>
    HttpResponse.json(
      {
        submissionId: 1,
        subscriptionId: 1,
        amount: 5000,
        last6Digits: "123456",
        status: "pending",
        rejectionReason: null,
        submittedAt: new Date(0).toISOString(),
      },
      { status: 201 }
    )
  ),

  // Image upload — returns a backend-root-relative path (see the contract).
  http.post("/api/v1/uploads/images", () =>
    HttpResponse.json(
      { url: "/uploads/images/test-image.png", filename: "test-image.png" },
      { status: 201 }
    )
  ),

  // Hobbyist → professional upgrade (author self-service).
  http.post("/api/v1/authors/upgrade-request", () =>
    HttpResponse.json({
      authorId: 10,
      username: "hobbyist1",
      bio: "Aspiring writer.",
      careerStage: "hobbyist",
      isMonetizationEnabled: false,
      monthlySubscriptionPrice: null,
      payoutWalletProvider: null,
      payoutWalletNumber: null,
      availableBalance: 0,
      totalEarned: 0,
      professionalRequested: true,
      professionalRequestedAt: new Date(0).toISOString(),
    })
  ),

  // Admin upgrade-requests queue.
  http.get("/api/v1/admin/authors/upgrade-requests", () =>
    HttpResponse.json([
      {
        userId: 42,
        username: "hobbyist1",
        email: "hobbyist@example.com",
        bio: "Aspiring writer.",
        careerStage: "hobbyist",
        requestedAt: new Date(0).toISOString(),
      },
    ])
  ),

  http.get("/api/v1/authors/:authorId/feed", () => HttpResponse.json([])),

  http.get("/api/v1/authors/:authorId/balance", () =>
    HttpResponse.json({ availableBalance: 40000, totalEarned: 120000 })
  ),
  http.get("/api/v1/authors/:authorId/earnings", () => HttpResponse.json([])),
  http.get("/api/v1/authors/:authorId/withdrawals", () => HttpResponse.json([])),

  // Notifications (polling delivery). Default: empty list, zero unread.
  http.get("/api/v1/notifications", () => HttpResponse.json([])),
  http.get("/api/v1/notifications/unread-count", () => HttpResponse.json({ count: 0 })),
  http.put("/api/v1/notifications/:id/read", () => new HttpResponse(null, { status: 204 })),
  http.put("/api/v1/notifications/read-all", () => new HttpResponse(null, { status: 204 })),
]
