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

  it("lets a monetization-enabled author edit their price", async () => {
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
        })
      )
    )

    renderPage()

    const price = (await screen.findByLabelText(/subscription price/i)) as HTMLInputElement
    expect(price).not.toBeDisabled()
    expect(price.value).toBe("5000")
  })

  it("locks the price field until monetization is enabled", async () => {
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
        })
      )
    )

    renderPage()

    expect(await screen.findByLabelText(/subscription price/i)).toBeDisabled()
    expect(screen.getByText(/once an admin enables monetization/i)).toBeInTheDocument()
  })
})
