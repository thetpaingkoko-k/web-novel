import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  it("renders each recorded action as a row with its labelled type", async () => {
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

    // Each action's type renders as a status pill in its row.
    expect(await screen.findByText("User approval")).toBeInTheDocument()
    expect(screen.getByText("Payment approved")).toBeInTheDocument()
    expect(screen.getByText("Payment rejected")).toBeInTheDocument()
    expect(screen.getByText("Withdrawal approved")).toBeInTheDocument()
    // …alongside every action's target.
    expect(screen.getByText("target-1")).toBeInTheDocument()
    expect(screen.getByText("target-4")).toBeInTheDocument()
  })

  it("deletes an audit entry from the row menu after confirmation", async () => {
    const user = userEvent.setup()
    let deletedId: number | undefined
    server.use(
      http.get("/api/v1/admin/actions", () => HttpResponse.json([action(5, "ban")])),
      http.delete("/api/v1/admin/actions/5", () => {
        deletedId = 5
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderAuditLog()

    await screen.findByText("target-5")
    await user.click(screen.getByRole("button", { name: /^actions$/i }))
    await user.click(await screen.findByRole("menuitem", { name: /delete entry/i }))
    // Confirm in the alert dialog (its action shares the "Delete entry" label).
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /delete entry/i }))

    await waitFor(() => expect(deletedId).toBe(5))
  })
})
