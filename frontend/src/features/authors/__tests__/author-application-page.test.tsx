import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router"
import { tokenStorage } from "@/api/client"
import { AuthProvider } from "@/features/auth/auth-context"
import { AuthorApplicationPage } from "@/features/authors/author-application-page"
import { Toaster } from "@/components/ui/sonner"
import type { AuthUser } from "@/types/auth"
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/authors/apply"]}>
          <AuthorApplicationPage />
        </MemoryRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("AuthorApplicationPage", () => {
  afterEach(() => tokenStorage.clearTokens())

  it("validates a too-short bio", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json(READER)))
    const user = userEvent.setup()

    renderPage()

    // Fill motivation + interests validly so only the bio fails validation.
    await user.type(await screen.findByLabelText(/about you/i), "too short")
    await user.type(
      screen.getByLabelText(/why do you want to write/i),
      "I have stories that have lived in my head for years."
    )
    await user.type(
      screen.getByLabelText(/what do you want to write/i),
      "Cozy fantasy about tea shops and quiet everyday magic."
    )
    await user.click(screen.getByRole("button", { name: /submit application/i }))

    expect(await screen.findByText(/at least 20 characters/i)).toBeInTheDocument()
  })

  it("submits bio, writingMotivation and writingInterests, then shows the pending state", async () => {
    tokenStorage.setTokens("access", "refresh")
    let captured: unknown = null
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(READER)),
      http.post("/api/v1/authors/apply", async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({ ...READER, status: "pending" })
      })
    )
    const user = userEvent.setup()

    renderPage()

    await user.type(
      await screen.findByLabelText(/about you/i),
      "I write cozy fantasy about tea shops and quiet magic."
    )
    await user.type(
      screen.getByLabelText(/why do you want to write/i),
      "Writing is how I make sense of the world around me."
    )
    await user.type(
      screen.getByLabelText(/what do you want to write/i),
      "Slow, warm slice-of-life fantasy with gentle stakes."
    )
    await user.click(screen.getByRole("button", { name: /submit application/i }))

    expect(await screen.findByText(/under review/i)).toBeInTheDocument()
    expect(captured).toEqual({
      bio: "I write cozy fantasy about tea shops and quiet magic.",
      writingMotivation: "Writing is how I make sense of the world around me.",
      writingInterests: "Slow, warm slice-of-life fantasy with gentle stakes.",
    })
  })
})
