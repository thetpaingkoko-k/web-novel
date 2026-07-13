import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router"
import { tokenStorage } from "@/api/client"
import { AuthProvider } from "@/features/auth/auth-context"
import { AuthorSettingsPage } from "@/features/authors/author-settings-page"
import type { AuthUser } from "@/types/auth"
import { server } from "@/test/mocks/server"
import "@/i18n"

const PRO: AuthUser = {
  userId: 10,
  username: "moonlight_writer",
  email: "author@example.com",
  role: "professional_author",
  status: "approved",
  isMonetizationEnabled: true,
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/author/settings"]}>
          <AuthorSettingsPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("AuthorSettingsPage", () => {
  afterEach(() => tokenStorage.clearTokens())

  it("shows a monetized author their admin-set price read-only", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(PRO)),
      http.get("/api/v1/authors/me", () =>
        HttpResponse.json({
          authorId: 10,
          username: "moonlight_writer",
          bio: "Writes about embers.",
          careerStage: "professional",
          isMonetizationEnabled: true,
          monthlySubscriptionPrice: 5000,
          payoutWalletProvider: "KBZPay",
          payoutWalletNumber: "09123456789",
          availableBalance: 40000,
          totalEarned: 120000,
        })
      )
    )

    renderPage()

    // The price is shown as read-only text, not an editable input.
    expect(await screen.findByText(/5000 MMK/i)).toBeInTheDocument()
    expect(screen.getByText(/set by an administrator/i)).toBeInTheDocument()
    expect(screen.queryByRole("spinbutton", { name: /subscription price/i })).not.toBeInTheDocument()
  })

  it("hides the price entirely until monetization is enabled", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({ ...PRO, role: "hobbyist_author", isMonetizationEnabled: false })
      ),
      http.get("/api/v1/authors/me", () =>
        HttpResponse.json({
          authorId: 10,
          username: "moonlight_writer",
          bio: null,
          careerStage: "hobbyist",
          isMonetizationEnabled: false,
          monthlySubscriptionPrice: null,
          payoutWalletProvider: null,
          payoutWalletNumber: null,
          availableBalance: 0,
          totalEarned: 0,
        })
      )
    )

    renderPage()

    // Wait for the form to load (Save button), then assert no price section is present.
    expect(await screen.findByRole("button", { name: /save/i })).toBeInTheDocument()
    expect(screen.queryByText(/subscription price/i)).not.toBeInTheDocument()
  })
})
