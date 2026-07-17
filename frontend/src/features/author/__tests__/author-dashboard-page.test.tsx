import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"
import { tokenStorage } from "@/api/client"
import { Toaster } from "@/components/ui/sonner"
import { AuthorDashboardPage } from "@/features/author/author-dashboard-page"
import { AuthProvider } from "@/features/auth/auth-context"
import { server } from "@/test/mocks/server"
import "@/i18n"

function mockHobbyist(monetization = false) {
  tokenStorage.setTokens("token", "refresh")
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        userId: 5,
        username: "hobbyist1",
        email: "hobbyist@example.com",
        role: "hobbyist_author",
        status: "approved",
        isMonetizationEnabled: monetization,
      })
    )
  )
}

function authorMe(professionalRequested: boolean) {
  return {
    authorId: 5,
    username: "hobbyist1",
    bio: "Aspiring writer.",
    careerStage: "hobbyist",
    isMonetizationEnabled: false,
    monthlySubscriptionPrice: null,
    payoutWalletProvider: null,
    payoutWalletNumber: null,
    availableBalance: 0,
    totalEarned: 0,
    professionalRequested,
    professionalRequestedAt: professionalRequested ? new Date(0).toISOString() : null,
  }
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <AuthorDashboardPage />
          <Toaster />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

afterEach(() => tokenStorage.clearTokens())

describe("AuthorDashboardPage upgrade section", () => {
  it("lets a hobbyist request an upgrade", async () => {
    const user = userEvent.setup()
    mockHobbyist()
    server.use(http.get("/api/v1/authors/me", () => HttpResponse.json(authorMe(false))))

    renderDashboard()

    await user.click(await screen.findByRole("button", { name: /request upgrade/i }))

    expect(await screen.findByText(/upgrade request submitted/i)).toBeInTheDocument()
  })

  it("shows a pending message once requested", async () => {
    mockHobbyist()
    server.use(http.get("/api/v1/authors/me", () => HttpResponse.json(authorMe(true))))

    renderDashboard()

    expect(await screen.findByText(/pending admin review/i)).toBeInTheDocument()
  })
})

describe("AuthorDashboardPage header + series", () => {
  it("renders the author name in the header and a create-new-series CTA", async () => {
    mockHobbyist()
    server.use(http.get("/api/v1/authors/me", () => HttpResponse.json(authorMe(false))))

    renderDashboard()

    expect(await screen.findByRole("heading", { name: /hobbyist1/i })).toBeInTheDocument()
    const cta = await screen.findByRole("link", { name: /create new series/i })
    expect(cta).toHaveAttribute("href", "/author/books/new")
  })

  it("shows the pro earnings summary card linking to /author/earnings", async () => {
    tokenStorage.setTokens("token", "refresh")
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({
          userId: 10,
          username: "moonlight_writer",
          email: "author@example.com",
          role: "professional_author",
          status: "approved",
          isMonetizationEnabled: true,
        })
      ),
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
          professionalRequested: false,
          professionalRequestedAt: null,
        })
      )
    )

    renderDashboard()

    expect(await screen.findByText(/40000 MMK/)).toBeInTheDocument()
    expect(await screen.findByText(/120000 MMK/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /view earnings/i })).toHaveAttribute(
      "href",
      "/author/earnings"
    )
  })
})
