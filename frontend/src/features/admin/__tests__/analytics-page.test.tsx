import { screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { AnalyticsPage } from "@/features/admin/pages/analytics-page"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/test-utils"

describe("AnalyticsPage", () => {
  it("renders the payment revenue split as stat cards", async () => {
    server.use(
      http.get("/api/v1/admin/analytics/payments", () =>
        HttpResponse.json({
          totalReaderRevenue: 15000,
          totalAuthorEarnings: 12000,
          platformProfit: 3000,
          approvedPaymentCount: 3,
        })
      )
    )

    renderWithProviders(<AnalyticsPage />)

    expect(await screen.findByText("Reader revenue")).toBeInTheDocument()
    expect(screen.getByText("Platform profit")).toBeInTheDocument()
    expect(screen.getByText("Author earnings")).toBeInTheDocument()
    expect(screen.getByText(/15,000 MMK/)).toBeInTheDocument()
    expect(screen.getByText(/3,000 MMK/)).toBeInTheDocument()
    expect(screen.getByText("Approved payments")).toBeInTheDocument()
  })
})
