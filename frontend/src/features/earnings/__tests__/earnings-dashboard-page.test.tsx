import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { tokenStorage } from "@/api/client"
import { EarningsDashboardPage } from "@/features/earnings/earnings-dashboard-page"
import { EarningsLedgerPage } from "@/features/earnings/earnings-ledger-page"
import { EarningsWithdrawalsPage } from "@/features/earnings/earnings-withdrawals-page"
import { AuthProvider } from "@/features/auth/auth-context"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderWithAuth(ui: ReactNode) {
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

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("EarningsDashboardPage (overview)", () => {
  it("shows the balance stats, the withdrawal form and links to the two detail pages", async () => {
    renderWithAuth(<EarningsDashboardPage />)

    expect(await screen.findByText("40000 MMK")).toBeInTheDocument()
    expect(screen.getByText("120000 MMK")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument()

    expect(screen.getByRole("link", { name: /view earning ledger/i })).toHaveAttribute(
      "href",
      "/author/earnings/ledger"
    )
    expect(screen.getByRole("link", { name: /view withdrawal history/i })).toHaveAttribute(
      "href",
      "/author/earnings/withdrawals"
    )
  })

  it("shows a validation error below the minimum withdrawal amount", async () => {
    const user = userEvent.setup()
    renderWithAuth(<EarningsDashboardPage />)

    await screen.findByText("40000 MMK")
    await user.type(screen.getByLabelText(/amount \(mmk\)/i), "100")
    await user.type(screen.getByLabelText(/wallet number/i), "09123456789")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    expect(await screen.findByText(/minimum withdrawal/i)).toBeInTheDocument()
  })
})

describe("EarningsLedgerPage", () => {
  it("shows the empty state when there are no earnings", async () => {
    server.use(http.get("/api/v1/authors/:authorId/earnings", () => HttpResponse.json([])))
    renderWithAuth(<EarningsLedgerPage />)

    expect(await screen.findByText(/no earnings yet/i)).toBeInTheDocument()
  })

  it("paginates the ledger client-side (15 rows per page)", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      earningId: i + 1,
      grossAmount: 10000 + i,
      platformFeePercent: 0,
      platformFeeAmount: 0,
      netAmount: 500000 + i,
      createdAt: new Date(0).toISOString(),
    }))
    server.use(http.get("/api/v1/authors/:authorId/earnings", () => HttpResponse.json(rows)))

    const user = userEvent.setup()
    renderWithAuth(<EarningsLedgerPage />)

    // First page: the first net amount is visible, the last is not yet.
    expect(await screen.findByText("500000 MMK")).toBeInTheDocument()
    expect(screen.queryByText("500019 MMK")).not.toBeInTheDocument()
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /next/i }))

    expect(await screen.findByText("500019 MMK")).toBeInTheDocument()
    expect(screen.queryByText("500000 MMK")).not.toBeInTheDocument()
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument()
  })
})

describe("EarningsWithdrawalsPage", () => {
  it("shows the empty state when there are no withdrawals", async () => {
    server.use(http.get("/api/v1/authors/:authorId/withdrawals", () => HttpResponse.json([])))
    renderWithAuth(<EarningsWithdrawalsPage />)

    expect(await screen.findByText(/no withdrawals requested/i)).toBeInTheDocument()
  })
})
