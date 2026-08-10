import { waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { BooksBrowsePage } from "@/features/books/books-browse-page"
import { server } from "@/test/mocks/server"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("BooksBrowsePage", () => {
  it("renders the mocked book after loading", async () => {
    renderWithProviders(<BooksBrowsePage />)

    expect(await screen.findByText("The Last Ember")).toBeInTheDocument()
  })

  it("shows a designed empty state when no books match", async () => {
    server.use(http.get("/api/v1/books", () => HttpResponse.json([])))
    renderWithProviders(<BooksBrowsePage />)

    expect(await screen.findByText(/no books match/i)).toBeInTheDocument()
  })

  it("sends the exact canonical enum name when a genre chip is selected", async () => {
    const user = userEvent.setup()
    let lastGenre: string | null = "unset"
    server.use(
      http.get("/api/v1/books", ({ request }) => {
        lastGenre = new URL(request.url).searchParams.get("genre")
        return HttpResponse.json([])
      })
    )
    renderWithProviders(<BooksBrowsePage />)

    // "Sci-Fi" is the display label for the canonical `SciFi` enum value.
    await user.click(await screen.findByRole("button", { name: "Sci-Fi", pressed: false }))

    await waitFor(() => expect(lastGenre).toBe("SciFi"))
  })

  it("shows Prev/Next and requests the next page when there are multiple pages", async () => {
    const user = userEvent.setup()
    const requestedPages: string[] = []
    server.use(
      http.get("/api/v1/books", ({ request }) => {
        requestedPages.push(new URL(request.url).searchParams.get("page") ?? "0")
        return HttpResponse.json(
          [
            {
              bookId: 1,
              authorUsername: "a",
              authorAvatarUrl: null,
              title: "Paged Book",
              genres: [],
              coverImageUrl: null,
              status: "ongoing",
              isPremium: false,
              chapterCount: 1,
              readChaptersCount: null,
            },
          ],
          { headers: { "X-Total-Count": "50" } }, // 50 / 24 → 3 pages
        )
      }),
    )
    renderWithProviders(<BooksBrowsePage />)

    expect(await screen.findByText("Paged Book")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: /next/i }))
    await waitFor(() => expect(requestedPages).toContain("1"))
  })

  it("forwards the search box to the server as a `search` query param", async () => {
    const user = userEvent.setup()
    let lastSearch: string | null = "unset"
    server.use(
      http.get("/api/v1/books", ({ request }) => {
        lastSearch = new URL(request.url).searchParams.get("search")
        return HttpResponse.json([])
      })
    )
    renderWithProviders(<BooksBrowsePage />)

    await user.type(screen.getByPlaceholderText(/search/i), "ember")

    // useDeferredValue settles asynchronously; wait for the request to carry it.
    await waitFor(() => expect(lastSearch).toBe("ember"))
  })
})
