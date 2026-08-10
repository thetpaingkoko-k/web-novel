import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/features/auth/auth-context"
import { ReportDialog } from "@/features/moderation/report-dialog"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderReportDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ReportDialog targetType="chapter_comment" targetId={5} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

/** Sign an admin in so the report entry point can be gated off. */
function authenticateAdmin() {
  localStorage.setItem("webnovel_access_token", "test-access-token")
  localStorage.setItem("webnovel_refresh_token", "test-refresh-token")
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        userId: 99,
        username: "admin",
        email: "admin@example.com",
        role: "admin",
        status: "approved",
        isMonetizationEnabled: false,
      })
    )
  )
}

describe("ReportDialog", () => {
  afterEach(() => localStorage.clear())

  it("renders nothing for an admin (admins moderate directly, don't report)", async () => {
    authenticateAdmin()
    renderReportDialog()

    // Once the admin identity resolves, the report trigger drops out entirely.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /report/i })).not.toBeInTheDocument()
    )
  })

  it("composes a report from a preset reason plus details", async () => {
    const user = userEvent.setup()
    let received: unknown
    server.use(
      http.post("/api/v1/reports", async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ reportId: 1 })
      })
    )

    renderReportDialog()

    await user.click(screen.getByRole("button", { name: /report/i }))
    // Pick the "Untagged spoilers" preset from the reason select.
    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /untagged spoilers/i }))
    await user.type(screen.getByLabelText(/additional details/i), "chapter 12 twist")
    await user.click(screen.getByRole("button", { name: /submit report/i }))

    expect(await screen.findByText(/report submitted/i)).toBeInTheDocument()
    expect(received).toEqual({
      targetType: "chapter_comment",
      targetId: 5,
      reason: "Untagged spoilers: chapter 12 twist",
    })
  })

  it("requires a preset reason to be selected", async () => {
    const user = userEvent.setup()
    renderReportDialog()

    await user.click(screen.getByRole("button", { name: /report/i }))
    await user.click(screen.getByRole("button", { name: /submit report/i }))

    expect(await screen.findByText(/please choose a reason/i)).toBeInTheDocument()
  })

  it("requires details when 'Other' is chosen", async () => {
    const user = userEvent.setup()
    renderReportDialog()

    await user.click(screen.getByRole("button", { name: /report/i }))
    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /^other$/i }))
    await user.click(screen.getByRole("button", { name: /submit report/i }))

    expect(await screen.findByText(/add a few details/i)).toBeInTheDocument()
  })
})
