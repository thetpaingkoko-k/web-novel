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

    await user.type(await screen.findByLabelText(/about you/i), "too short")
    await user.click(screen.getByRole("button", { name: /submit application/i }))

    expect(await screen.findByText(/at least 20 characters/i)).toBeInTheDocument()
  })

  it("shows the pending state after a successful application", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(READER)),
      http.post("/api/v1/authors/apply", () =>
        HttpResponse.json({ ...READER, status: "pending" })
      )
    )
    const user = userEvent.setup()

    renderPage()

    await user.type(
      await screen.findByLabelText(/about you/i),
      "I write cozy fantasy about tea shops and quiet magic."
    )
    await user.click(screen.getByRole("button", { name: /submit application/i }))

    expect(await screen.findByText(/under review/i)).toBeInTheDocument()
  })
})
