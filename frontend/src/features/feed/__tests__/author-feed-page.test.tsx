import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { AuthorFeedPage } from "@/features/feed/author-feed-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderFeed(authorId: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/authors/${authorId}/feed`]}>
          <Routes>
            <Route path="/authors/:authorId/feed" element={<AuthorFeedPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("AuthorFeedPage", () => {
  it("renders feed posts with a subscribers-only badge", async () => {
    server.use(
      http.get("/api/v1/authors/10/feed", () =>
        HttpResponse.json([
          {
            feedPostId: 1,
            authorId: 10,
            title: "Chapter 12 is up early",
            content: "Thanks for reading!",
            isPremiumOnly: true,
            publishedAt: new Date(0).toISOString(),
          },
        ])
      )
    )

    renderFeed(10)

    expect(await screen.findByText("Chapter 12 is up early")).toBeInTheDocument()
    expect(screen.getByText(/subscribers only/i)).toBeInTheDocument()
  })

  it("shows an empty state when the author has no posts", async () => {
    server.use(http.get("/api/v1/authors/10/feed", () => HttpResponse.json([])))

    renderFeed(10)

    expect(await screen.findByText(/no updates yet/i)).toBeInTheDocument()
  })
})
