import { screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { ReportsQueuePage } from "@/features/admin/pages/reports-queue-page"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/test-utils"

const report = {
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
}

describe("ReportsQueuePage", () => {
  it("surfaces the reported content and its author so the admin can act", async () => {
    server.use(
      http.get("/api/v1/admin/reports", () => HttpResponse.json([report]))
    )

    renderWithProviders(<ReportsQueuePage />)

    // The actual reported content, not just an id.
    expect(await screen.findByText(/spoils the ending/i)).toBeInTheDocument()
    // Authored-by attribution, linked to the author profile.
    const authorLink = screen.getByRole("link", { name: /spoiler_sam/i })
    expect(authorLink).toHaveAttribute("href", "/authors/99")
    // The reporter's reason is still shown.
    expect(screen.getByText(/contains spoilers/i)).toBeInTheDocument()
  })
})
