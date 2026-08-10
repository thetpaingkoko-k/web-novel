import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { ReportsQueuePage } from "@/features/admin/pages/reports-queue-page"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/test-utils"

type Report = {
  reportId: number
  reporterId: number
  reporterUsername: string
  targetType: string
  targetId: number
  targetContent: string | null
  targetAuthorId: number | null
  targetAuthorUsername: string | null
  reason: string
  status: string
  createdAt: string
  resolvedAt: string | null
}

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    reportId: 7,
    reporterId: 1,
    reporterUsername: "reader1",
    targetType: "chapter_comment",
    targetId: 42,
    targetContent: "This spoils the ending for everyone!",
    targetAuthorId: 99,
    targetAuthorUsername: "spoiler_sam",
    reason: "Contains spoilers",
    status: "pending",
    createdAt: new Date(0).toISOString(),
    resolvedAt: null,
    ...overrides,
  }
}

describe("ReportsQueuePage", () => {
  it("surfaces the reported content and its author so the admin can act", async () => {
    server.use(
      http.get("/api/v1/admin/reports", () => HttpResponse.json([makeReport()]))
    )

    renderWithProviders(<ReportsQueuePage />)

    expect(await screen.findByText(/spoils the ending/i)).toBeInTheDocument()
    const authorLink = screen.getByRole("link", { name: /spoiler_sam/i })
    expect(authorLink).toHaveAttribute("href", "/authors/99")
    expect(screen.getByText(/contains spoilers/i)).toBeInTheDocument()
  })

  it("requests the matching status when a tab is selected", async () => {
    const requestedStatuses: (string | null)[] = []
    server.use(
      http.get("/api/v1/admin/reports", ({ request }) => {
        const status = new URL(request.url).searchParams.get("status")
        requestedStatuses.push(status)
        return HttpResponse.json([])
      })
    )

    renderWithProviders(<ReportsQueuePage />)

    await waitFor(() => expect(requestedStatuses).toContain("pending"))

    await userEvent.click(await screen.findByRole("tab", { name: /actioned/i }))

    await waitFor(() => expect(requestedStatuses).toContain("action_taken"))
  })

  it("hides reported content via the hide-target endpoint", async () => {
    let hideCalled = false
    server.use(
      http.get("/api/v1/admin/reports", () =>
        HttpResponse.json([makeReport({ targetType: "chapter_comment" })])
      ),
      http.put("/api/v1/admin/reports/:id/hide-target", ({ params }) => {
        hideCalled = true
        return HttpResponse.json(
          makeReport({ reportId: Number(params.id), status: "action_taken" })
        )
      })
    )

    renderWithProviders(<ReportsQueuePage />)

    await userEvent.click(await screen.findByRole("button", { name: /hide content/i }))

    await waitFor(() => expect(hideCalled).toBe(true))
  })

  it("unhides content from the actioned tab via the unhide-target endpoint", async () => {
    let unhideCalled = false
    server.use(
      http.get("/api/v1/admin/reports", ({ request }) => {
        const status = new URL(request.url).searchParams.get("status")
        if (status === "action_taken") {
          return HttpResponse.json([makeReport({ status: "action_taken" })])
        }
        return HttpResponse.json([])
      }),
      http.put("/api/v1/admin/reports/:id/unhide-target", () => {
        unhideCalled = true
        return HttpResponse.json(makeReport({ status: "pending" }))
      })
    )

    renderWithProviders(<ReportsQueuePage />)

    await userEvent.click(await screen.findByRole("tab", { name: /actioned/i }))

    await userEvent.click(await screen.findByRole("button", { name: /unhide content/i }))

    await waitFor(() => expect(unhideCalled).toBe(true))
  })

  it("deletes a reported book after confirming the dialog", async () => {
    let deleteCalled = false
    server.use(
      http.get("/api/v1/admin/reports", () =>
        HttpResponse.json([
          makeReport({
            targetType: "book",
            targetId: 500,
            targetContent: "A Reported Novel",
          }),
        ])
      ),
      http.delete("/api/v1/books/:id", ({ params }) => {
        if (Number(params.id) === 500) deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderWithProviders(<ReportsQueuePage />)

    // Opening the confirm dialog does not delete yet.
    await userEvent.click(await screen.findByRole("button", { name: /delete book/i }))
    expect(deleteCalled).toBe(false)

    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(within(dialog).getByRole("button", { name: /delete book/i }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it("paginates when there are more than ten reports", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeReport({
        reportId: i + 1,
        targetId: i + 1,
        targetContent: `Reported item number ${i + 1}`,
      })
    )
    server.use(http.get("/api/v1/admin/reports", () => HttpResponse.json(many)))

    renderWithProviders(<ReportsQueuePage />)

    // Page 1 shows the first item but not the twelfth.
    expect(await screen.findByText(/Reported item number 1$/)).toBeInTheDocument()
    expect(screen.queryByText(/Reported item number 12$/)).not.toBeInTheDocument()
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /next/i }))

    expect(await screen.findByText(/Reported item number 12$/)).toBeInTheDocument()
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument()
  })
})
