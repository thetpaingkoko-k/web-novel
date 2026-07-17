import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router"
import { tokenStorage } from "@/api/client"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/features/auth/auth-context"
import { BookmarkButton } from "@/features/bookmarks/components/bookmark-button"
import { MyListPage } from "@/features/bookmarks/my-list-page"
import type { AuthUser } from "@/types/auth"
import type { BookListItem } from "@/types/content"
import { server } from "@/test/mocks/server"
import "@/i18n"

const READER: AuthUser = {
  userId: 1,
  username: "reader_rin",
  email: "rin@example.com",
  role: "reader",
  status: "approved",
  isMonetizationEnabled: false,
  avatarUrl: null,
  gender: null,
  dateOfBirth: null,
  createdAt: null,
}

const SAVED_BOOK: BookListItem = {
  bookId: 7,
  authorUsername: "moonlight_writer",
  title: "The Saved Tale",
  genres: ["Fantasy"],
  coverImageUrl: null,
  status: "ongoing",
  isPremium: false,
  chapterCount: 2,
  readChaptersCount: null,
}

function withProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("Bookmarks", () => {
  afterEach(() => tokenStorage.clearTokens())

  it("saves a book from the bookmark button (POST /books/{id}/bookmark)", async () => {
    tokenStorage.setTokens("access", "refresh")
    let posted = false
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(READER)),
      http.get("/api/v1/bookmarks/me", () => HttpResponse.json([])),
      http.post("/api/v1/books/7/bookmark", () => {
        posted = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = userEvent.setup()

    withProviders(<BookmarkButton bookId={7} />)

    const btn = await screen.findByRole("button", { name: /save/i })
    await user.click(btn)

    await waitFor(() => expect(posted).toBe(true))
    expect(await screen.findByText(/added to your list/i)).toBeInTheDocument()
  })

  it("lists saved books on My List, with an empty state otherwise", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(READER)),
      http.get("/api/v1/bookmarks/me", () => HttpResponse.json([SAVED_BOOK]))
    )

    withProviders(<MyListPage />)

    expect(await screen.findByText(/the saved tale/i)).toBeInTheDocument()
  })
})
