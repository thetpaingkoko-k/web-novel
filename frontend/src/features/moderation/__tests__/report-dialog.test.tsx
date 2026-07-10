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
  it("files a report and confirms via toast", async () => {
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
    await user.type(screen.getByLabelText(/reason/i), "Spoilers without warning")
    await user.click(screen.getByRole("button", { name: /submit report/i }))

    expect(await screen.findByText(/report submitted/i)).toBeInTheDocument()
    expect(received).toEqual({
      targetType: "chapter_comment",
      targetId: 5,
      reason: "Spoilers without warning",
    })
  })

  it("validates that a reason is required", async () => {
    const user = userEvent.setup()
    renderReportDialog()

    await user.click(screen.getByRole("button", { name: /report/i }))
    await user.click(screen.getByRole("button", { name: /submit report/i }))

    expect(await screen.findByText(/required/i)).toBeInTheDocument()
  })
})
