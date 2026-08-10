import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { TrendingCarousel } from "@/features/home/components/trending-carousel"
import { server } from "@/test/mocks/server"
import type { TrendingBook } from "@/types/content"
import { renderWithProviders, screen, waitFor } from "@/test/test-utils"

function trending(books: TrendingBook[]) {
  server.use(http.get("/api/v1/books/trending", () => HttpResponse.json(books)))
}

const BOOK = (over: Partial<TrendingBook>): TrendingBook => ({
  bookId: 1,
  title: "The Last Ember",
  coverImageUrl: null,
  status: "ongoing",
  isPremium: false,
  authorUsername: "moonlight_writer",
  authorAvatarUrl: null,
  careerStage: "professional",
  chapterCount: 3,
  viewCount: 1200,
  likeCount: 88,
  commentCount: 14,
  genres: ["Fantasy"],
  ...over,
})

describe("TrendingCarousel", () => {
  it("renders nothing when there is nothing trending", async () => {
    trending([])
    const { container } = renderWithProviders(<TrendingCarousel />)
    await waitFor(() => expect(container.querySelector("section")).toBeNull())
  })

  it("shows the top book with its engagement signals", async () => {
    trending([BOOK({})])
    renderWithProviders(<TrendingCarousel />)

    expect(await screen.findByRole("heading", { name: "The Last Ember" })).toBeInTheDocument()
    // The counters the ranking is built from are surfaced on the slide.
    expect(screen.getByText("1,200")).toBeInTheDocument()
    expect(screen.getByText("88")).toBeInTheDocument()
    expect(screen.getByText("14")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /read now/i })).toHaveAttribute("href", "/books/1")
  })

  it("exposes slide navigation when several books trend", async () => {
    trending([
      BOOK({ bookId: 1, title: "First" }),
      BOOK({ bookId: 2, title: "Second" }),
    ])
    renderWithProviders(<TrendingCarousel />)

    expect(await screen.findByRole("heading", { name: "First" })).toBeInTheDocument()
    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(2)

    // Clicking the second dot swaps the active slide.
    tabs[1].click()
    expect(await screen.findByRole("heading", { name: "Second" })).toBeInTheDocument()
  })

  it("shows a single slide without navigation controls", async () => {
    trending([BOOK({})])
    renderWithProviders(<TrendingCarousel />)

    await screen.findByRole("heading", { name: "The Last Ember" })
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })
})
