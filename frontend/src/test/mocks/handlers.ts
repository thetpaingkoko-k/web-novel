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
    title: "The Last Ember",
    genre: "Fantasy",
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
  title: "The Last Ember",
  synopsis: "A hobbyist tale of embers and ash.",
  genre: "Fantasy",
  coverImageUrl: null,
  status: "ongoing",
  isPremium: false,
  createdAt: new Date(0).toISOString(),
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

  http.get("/api/v1/books", () => HttpResponse.json(mockBookList)),
  http.get("/api/v1/books/:bookId", () => HttpResponse.json(mockBookDetail)),

  // Bookmarks (Bearer auth). List rows mirror GET /books (readChaptersCount is
  // null here); writes are idempotent 204s with empty bodies.
  http.get("/api/v1/bookmarks/me", () => HttpResponse.json(mockBookList)),
  http.post("/api/v1/books/:bookId/bookmark", () => new HttpResponse(null, { status: 204 })),
  http.delete("/api/v1/books/:bookId/bookmark", () => new HttpResponse(null, { status: 204 })),

  http.get("/api/v1/authors/:authorId", () =>
    HttpResponse.json({
      authorId: 10,
      username: "moonlight_writer",
      bio: "Writes about embers.",
      careerStage: "professional",
      isMonetizationEnabled: true,
      monthlySubscriptionPrice: 5000,
    })
  ),
  http.get("/api/v1/wallets/active", () =>
    HttpResponse.json({ walletId: 1, provider: "KBZPay", walletNumber: "09123456789", isActive: true })
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

  http.get("/api/v1/authors/:authorId/feed", () => HttpResponse.json([])),

  http.get("/api/v1/authors/:authorId/balance", () =>
    HttpResponse.json({ availableBalance: 40000, totalEarned: 120000 })
  ),
  http.get("/api/v1/authors/:authorId/earnings", () => HttpResponse.json([])),
  http.get("/api/v1/authors/:authorId/withdrawals", () => HttpResponse.json([])),
]
