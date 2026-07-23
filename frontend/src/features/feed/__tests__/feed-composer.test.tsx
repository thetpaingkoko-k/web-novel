import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"
import { tokenStorage } from "@/api/client"
import { AuthProvider } from "@/features/auth/auth-context"
import { FeedComposer } from "@/features/feed/components/feed-composer"
import { server } from "@/test/mocks/server"
import type { AuthUser } from "@/types/auth"
import "@/i18n"

const AUTHOR_ID = 10

function author(isMonetizationEnabled: boolean): AuthUser {
  return {
    userId: AUTHOR_ID,
    username: "moonlight_writer",
    email: "author@example.com",
    role: isMonetizationEnabled ? "professional_author" : "hobbyist_author",
    status: "approved",
    isMonetizationEnabled,
    avatarUrl: null,
    gender: null,
    dateOfBirth: null,
    createdAt: "2024-01-15T08:30:00Z",
  }
}

function renderComposer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <FeedComposer authorId={AUTHOR_ID} />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("FeedComposer", () => {
  afterEach(() => tokenStorage.clearTokens())

  it("hides the subscribers-only switch for a hobbyist who cannot monetize", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json(author(false))))

    renderComposer()

    // The explanation replaces the toggle — a hobbyist has no subscribers to gate for.
    expect(await screen.findByText(/becomes available once an admin enables monetization/i))
      .toBeInTheDocument()
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })

  it("offers the subscribers-only switch to a monetized author", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json(author(true))))

    renderComposer()

    await waitFor(() => expect(screen.getByRole("switch")).toBeInTheDocument())
    expect(screen.getByLabelText(/subscribers only/i)).toBeInTheDocument()
  })
})
