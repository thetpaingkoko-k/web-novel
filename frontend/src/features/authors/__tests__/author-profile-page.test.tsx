import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { AuthorProfilePage } from "@/features/authors/author-profile-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/authors/10"]}>
          <Routes>
            <Route path="/authors/:authorId" element={<AuthorProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("AuthorProfilePage", () => {
  it("shows the author, a subscribe action, their books, and feed posts", async () => {
    server.use(
      http.get("/api/v1/authors/10/feed", () =>
        HttpResponse.json([
          {
            feedPostId: 1,
            authorId: 10,
            title: "New chapter soon",
            content: "Working on the next arc.",
            premiumOnly: false,
            publishedAt: new Date(0).toISOString(),
          },
        ])
      )
    )

    renderProfile()

    expect((await screen.findAllByText(/moonlight_writer/i)).length).toBeGreaterThan(0)
    // Monetization-enabled author with a price exposes a proactive subscribe link.
    const subscribe = await screen.findByRole("link", { name: /subscribe/i })
    expect(subscribe).toHaveAttribute("href", "/authors/10/subscribe")
    // Published book surfaced from GET /books?authorId=10.
    expect(await screen.findByText(/the last ember/i)).toBeInTheDocument()
    // Feed post surfaced to readers on the profile (FR-11.2).
    expect(await screen.findByText(/new chapter soon/i)).toBeInTheDocument()
  })

  it("hides the subscribe action for an author without monetization enabled", async () => {
    server.use(
      http.get("/api/v1/authors/10", () =>
        HttpResponse.json({
          authorId: 10,
          username: "hobbyist_hana",
          bio: null,
          careerStage: "hobbyist",
          isMonetizationEnabled: false,
          monthlySubscriptionPrice: null,
        })
      )
    )

    renderProfile()

    expect(await screen.findByText(/hobbyist_hana/i)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /subscribe/i })).not.toBeInTheDocument()
  })
})
