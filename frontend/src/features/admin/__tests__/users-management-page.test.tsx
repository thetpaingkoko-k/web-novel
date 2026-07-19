import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { UsersManagementPage } from "@/features/admin/pages/users-management-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersManagementPage />
      <Toaster />
    </QueryClientProvider>
  )
}

const users = [
  {
    userId: 1,
    username: "reader_rin",
    email: "reader@example.com",
    role: "professional_author",
    status: "approved",
    careerStage: "professional",
    monetizationEnabled: true,
    monthlySubscriptionPrice: 5000,
    suspensionReason: null,
  },
  {
    userId: 5,
    username: "banned_bob",
    email: "bob@example.com",
    role: "reader",
    status: "banned",
    careerStage: null,
    monetizationEnabled: false,
    monthlySubscriptionPrice: null,
    suspensionReason: "Repeated violations",
  },
]

/** Open a row's ⋮ action menu by the account's username. */
async function openRowMenu(user: ReturnType<typeof userEvent.setup>, username: string) {
  // The username renders in both the desktop table and the mobile card list;
  // pick the first occurrence that carries a ⋮ menu button.
  const cells = await screen.findAllByText(username)
  let menuButton: HTMLButtonElement | null = null
  for (const cell of cells) {
    const row = cell.closest("tr") ?? cell.closest("li")
    const btn = row?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
    if (btn) {
      menuButton = btn
      break
    }
  }
  await user.click(menuButton!)
}

describe("UsersManagementPage", () => {
  it("reactivates a banned account from the row menu (FR-1.4)", async () => {
    const user = userEvent.setup()
    let reactivated = false
    server.use(
      http.get("/api/v1/admin/users", () => HttpResponse.json(users)),
      http.put("/api/v1/admin/users/5/reactivate", () => {
        reactivated = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderPage()

    await openRowMenu(user, "banned_bob")
    await user.click(await screen.findByRole("menuitem", { name: /reactivate/i }))

    await waitFor(() => expect(reactivated).toBe(true))
    expect(await screen.findByText(/user reactivated/i)).toBeInTheDocument()
  })

  it("only offers reactivate (not suspend/ban) for a banned user", async () => {
    const user = userEvent.setup()
    server.use(
      http.get("/api/v1/admin/users", () => HttpResponse.json([users[1]]))
    )

    renderPage()

    await openRowMenu(user, "banned_bob")
    expect(await screen.findByRole("menuitem", { name: /reactivate/i })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /^ban$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /suspend/i })).not.toBeInTheDocument()
  })

  it("requires a reason and sends { ban, reason } when suspending", async () => {
    const user = userEvent.setup()
    let sent: unknown = null
    server.use(
      http.get("/api/v1/admin/users", () => HttpResponse.json(users)),
      http.put("/api/v1/admin/users/1/suspend", async ({ request }) => {
        sent = await request.json()
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderPage()

    await openRowMenu(user, "reader_rin")
    await user.click(await screen.findByRole("menuitem", { name: /suspend/i }))

    // Submitting with no reason is blocked by the dialog's validation.
    await user.click(await screen.findByRole("button", { name: /^suspend$/i }))
    expect(sent).toBeNull()

    await user.type(screen.getByLabelText("Reason"), "Posting spam")
    await user.click(screen.getByRole("button", { name: /^suspend$/i }))

    await waitFor(() => expect(sent).toEqual({ ban: false, reason: "Posting spam" }))
    expect(await screen.findByText(/user suspended/i)).toBeInTheDocument()
  })

  it("shows the suspension reason in the details dialog for a banned user", async () => {
    const user = userEvent.setup()
    server.use(http.get("/api/v1/admin/users", () => HttpResponse.json([users[1]])))

    renderPage()

    await openRowMenu(user, "banned_bob")
    await user.click(await screen.findByRole("menuitem", { name: /view details/i }))

    expect(await screen.findByText(/repeated violations/i)).toBeInTheDocument()
  })
})
