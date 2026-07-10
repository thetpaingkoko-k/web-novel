import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { PaymentsQueuePage } from "@/features/admin/pages/payments-queue-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PaymentsQueuePage />
      <Toaster />
    </QueryClientProvider>
  )
}

const pendingPayment = {
  submissionId: 7,
  readerId: 1,
  readerUsername: "reader1",
  authorId: 10,
  authorUsername: "moonlight_writer",
  amount: 5000,
  last6Digits: "123456",
  screenshotUrl: "https://example.com/receipt.png",
  walletProvider: "KBZPay",
  status: "pending",
  submittedAt: new Date(0).toISOString(),
}

describe("PaymentsQueuePage", () => {
  it("approves a payment submission (FR-6.4)", async () => {
    const user = userEvent.setup()
    let approvedId: number | undefined
    server.use(
      http.get("/api/v1/admin/payment-submissions", () => HttpResponse.json([pendingPayment])),
      http.put("/api/v1/admin/payment-submissions/7/approve", () => {
        approvedId = 7
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderQueue()

    expect(await screen.findByText("reader1 → moonlight_writer")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^approve$/i }))

    await waitFor(() => expect(approvedId).toBe(7))
    expect(await screen.findByText(/author credited/i)).toBeInTheDocument()
  })
})
