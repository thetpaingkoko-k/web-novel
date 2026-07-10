import { http, HttpResponse } from "msw"
import type { Book, BookListItem } from "@/types/content"

export const mockBookList: BookListItem[] = [
  {
    bookId: 1,
    authorId: 10,
    authorUsername: "moonlight_writer",
    title: "The Last Ember",
    genre: "Fantasy",
    coverImageUrl: null,
    status: "ongoing",
    isPremium: false,
    chapterCount: 3,
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
      bookId: 1,
      chapterNumber: 1,
      title: "Sparks",
      status: "published",
      likeCount: 2,
      uniqueViewCount: 10,
      publishedAt: new Date(0).toISOString(),
      rejectionReason: null,
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
    return HttpResponse.json({ message: "invalid_credentials" }, { status: 401 })
  }),

  http.get("/api/v1/books", () => HttpResponse.json(mockBookList)),
  http.get("/api/v1/books/:bookId", () => HttpResponse.json(mockBookDetail)),

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
    HttpResponse.json({ submissionId: 1, status: "pending" })
  ),

  http.get("/api/v1/authors/:authorId/balance", () =>
    HttpResponse.json({ availableBalance: 40000, totalEarned: 120000 })
  ),
  http.get("/api/v1/authors/:authorId/earnings", () => HttpResponse.json([])),
  http.get("/api/v1/authors/:authorId/withdrawals", () => HttpResponse.json([])),
]
