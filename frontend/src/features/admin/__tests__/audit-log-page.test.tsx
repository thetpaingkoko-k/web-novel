import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { AuditLogPage } from "@/features/admin/pages/audit-log-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderAuditLog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuditLogPage />
    </QueryClientProvider>
  )
}

function action(id: number, actionType: string) {
  return {
    adminActionId: id,
    adminId: 1,
    adminUsername: "admin",
    actionType,
    targetType: "user",
    targetId: id,
    targetLabel: `target-${id}`,
    notes: null,
    createdAt: new Date(0).toISOString(),
  }
}

describe("AuditLogPage", () => {
  it("groups actions into labelled sections including subscriptions & payments", async () => {
    server.use(
      http.get("/api/v1/admin/actions", () =>
        HttpResponse.json([
          action(1, "user_approval"),
          action(2, "payment_approval"),
          action(3, "payment_rejection"),
          action(4, "withdrawal_approval"),
        ])
      )
    )

    renderAuditLog()

    expect(await screen.findByText("Approvals")).toBeInTheDocument()
    expect(screen.getByText("Subscriptions & payments")).toBeInTheDocument()
    expect(screen.getByText("Withdrawals")).toBeInTheDocument()
    // The new payment action types render with their own labels.
    expect(screen.getByText("Payment approved")).toBeInTheDocument()
    expect(screen.getByText("Payment rejected")).toBeInTheDocument()
  })
})
