import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"
import { tokenStorage } from "@/api/client"
import { AuthProvider } from "@/features/auth/auth-context"
import { DebateThreadPage } from "@/features/debates/debate-thread-page"
import type { AuthUser } from "@/types/auth"
import type { ThreadStatus } from "@/types/debates"
import { server } from "@/test/mocks/server"
import "@/i18n"

const CREATOR: AuthUser = {
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

function seedThread(status: ThreadStatus) {
  server.use(
    http.get("/api/v1/users/me", () => HttpResponse.json(CREATOR)),
    http.get("/api/v1/debates/601", () =>
      HttpResponse.json({
        threadId: 601,
        bookId: 2,
        creatorId: 1,
        creatorUsername: "reader_rin",
        creatorAvatarUrl: null,
        title: "What is the tea shop, really?",
        status,
        postCount: 0,
        createdAt: new Date(0).toISOString(),
      })
    ),
    http.get("/api/v1/debates/601/posts", () => HttpResponse.json([])),
    // The default book mock has one published chapter (id 100); mark it read so the
    // creator clears the 10%-read discussion gate.
    http.get("/api/v1/books/2/progress", () =>
      HttpResponse.json({ bookId: 2, lastChapterReadId: 100, updatedAt: new Date(0).toISOString() })
    )
  )
}

/** A premium book by author 10 (someone other than the reader) with no sub. */
function seedPremiumThread() {
  server.use(
    http.get("/api/v1/users/me", () => HttpResponse.json(CREATOR)),
    http.get("/api/v1/debates/601", () =>
      HttpResponse.json({
        threadId: 601,
        bookId: 2,
        creatorId: 1,
        creatorUsername: "reader_rin",
        creatorAvatarUrl: null,
        title: "What is the tea shop, really?",
        status: "open",
        postCount: 0,
        createdAt: new Date(0).toISOString(),
      })
    ),
    http.get("/api/v1/debates/601/posts", () => HttpResponse.json([])),
    http.get("/api/v1/books/2", () =>
      HttpResponse.json({
        bookId: 2,
        authorId: 10,
        authorUsername: "premium_pat",
        title: "Gilded Cage",
        synopsis: null,
        genres: [],
        coverImageUrl: null,
        status: "ongoing",
        isPremium: true,
        createdAt: new Date(0).toISOString(),
        chapters: [],
      })
    ),
    http.get("/api/v1/subscriptions/me", () => HttpResponse.json([])),
    http.get("/api/v1/books/2/progress", () =>
      HttpResponse.json({ bookId: 2, lastChapterReadId: null, updatedAt: new Date(0).toISOString() })
    )
  )
}

function renderThreadPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/debates/601"]}>
          <Routes>
            <Route path="/debates/:threadId" element={<DebateThreadPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("DebateThreadPage", () => {
  afterEach(() => tokenStorage.clearTokens())

  it("lets the thread creator lock an open discussion and shows the post composer", async () => {
    tokenStorage.setTokens("access", "refresh")
    seedThread("open")

    renderThreadPage()

    expect(await screen.findByRole("heading", { name: /what is the tea shop/i })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /lock/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/your post/i)).toBeInTheDocument()
  })

  it("hides the composer and offers reopen on a locked discussion", async () => {
    tokenStorage.setTokens("access", "refresh")
    seedThread("locked")

    renderThreadPage()

    expect(await screen.findByText(/this discussion is locked/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/your post/i)).not.toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /reopen/i })).toBeInTheDocument()
  })

  it("gates the composer on a premium book with no subscription", async () => {
    tokenStorage.setTokens("access", "refresh")
    seedPremiumThread()

    renderThreadPage()

    // Subscribe prompt replaces the composer for an unsubscribed reader.
    expect(
      await screen.findByRole("heading", { name: /subscribe to join the discussion/i })
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/your post/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /subscribe to premium_pat/i })
    ).toBeInTheDocument()
  })
})
