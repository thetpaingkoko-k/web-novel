import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { tokenStorage } from "@/api/client"
import { AuthProvider } from "@/features/auth/auth-context"
import { EarningsDashboardPage } from "@/features/earnings/earnings-dashboard-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderEarningsDashboard() {
  tokenStorage.setTokens("token", "refresh")
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        userId: 20,
        username: "pro_author",
        email: "pro@example.com",
        role: "professional_author",
        status: "approved",
        isMonetizationEnabled: true,
      })
    )
  )

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <EarningsDashboardPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("EarningsDashboardPage", () => {
  it("shows the current balance and empty states for ledger/withdrawals", async () => {
    renderEarningsDashboard()

    expect(await screen.findByText("40000 MMK")).toBeInTheDocument()
    expect(screen.getByText("120000 MMK")).toBeInTheDocument()
    expect(await screen.findByText(/no withdrawals requested/i)).toBeInTheDocument()
    expect(await screen.findByText(/no earnings yet/i)).toBeInTheDocument()
  })

  it("shows a validation error below the minimum withdrawal amount", async () => {
    const user = userEvent.setup()
    renderEarningsDashboard()

    await screen.findByText("40000 MMK")
    await user.type(screen.getByLabelText(/amount \(mmk\)/i), "100")
    await user.type(screen.getByLabelText(/wallet number/i), "09123456789")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    expect(await screen.findByText(/minimum withdrawal/i)).toBeInTheDocument()
  })
})
