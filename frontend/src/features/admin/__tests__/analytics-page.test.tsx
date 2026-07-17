import { screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { AnalyticsPage } from "@/features/admin/pages/analytics-page"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/test-utils"

describe("AnalyticsPage", () => {
  it("renders the revenue split and payout breakdown with the remaining balance", async () => {
    server.use(
      http.get("/api/v1/admin/analytics/payments", () =>
        HttpResponse.json({
          totalReaderRevenue: 15000,
          totalAuthorEarnings: 12000,
          platformProfit: 3000,
          approvedPaymentCount: 3,
          totalPaidOut: 5000,
          outstandingAuthorBalance: 7000,
          pendingWithdrawalAmount: 2000,
          pendingWithdrawalCount: 1,
        })
      ),
      http.get("/api/v1/admin/analytics/author-payouts", () =>
        HttpResponse.json([
          {
            authorId: 1,
            username: "novelist_jane",
            totalEarned: 8000,
            availableBalance: 5000,
            totalPaidOut: 3000,
            pendingAmount: 2000,
            pendingCount: 1,
          },
        ])
      )
    )

    renderWithProviders(<AnalyticsPage />)

    // Headline stat tiles. Platform profit / author earnings also label a meter
    // segment, so they appear more than once.
    expect(await screen.findByText("Reader revenue")).toBeInTheDocument()
    expect(screen.getAllByText("Platform profit").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Author earnings").length).toBeGreaterThan(0)
    expect(screen.getByText("Approved payments")).toBeInTheDocument()

    // The remaining balance the platform still holds for authors.
    expect(screen.getByText("Remaining balance held")).toBeInTheDocument()
    expect(screen.getByText(/7,000 MMK/)).toBeInTheDocument()

    // Payout breakdown segments.
    expect(screen.getByText("Paid out")).toBeInTheDocument()
    expect(screen.getByText("Pending payout")).toBeInTheDocument()
    expect(screen.getByText("Available to withdraw")).toBeInTheDocument()

    // Reader revenue appears in its stat tile (and again in the revenue meter legend).
    expect(screen.getAllByText(/15,000 MMK/).length).toBeGreaterThan(0)

    // Per-author balances table: the author and their remaining amount are listed.
    expect(await screen.findByText("Author balances")).toBeInTheDocument()
    expect(screen.getByText("novelist_jane")).toBeInTheDocument()
    // 5,000 MMK is this author's remaining balance (and the meter's "available" segment).
    expect(screen.getAllByText(/5,000 MMK/).length).toBeGreaterThan(0)
  })
})
