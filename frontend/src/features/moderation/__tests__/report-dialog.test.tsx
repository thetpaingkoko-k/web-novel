import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { ReportDialog } from "@/features/moderation/report-dialog"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderReportDialog() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportDialog targetType="chapter_comment" targetId={5} />
      <Toaster />
    </QueryClientProvider>
  )
}

describe("ReportDialog", () => {
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
