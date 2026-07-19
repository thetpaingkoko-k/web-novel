import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { NotificationBell } from "@/features/notifications/notification-bell"
import { server } from "@/test/mocks/server"
import { renderWithProviders, screen, waitFor } from "@/test/test-utils"

describe("NotificationBell", () => {
  it("renders the unread count on the badge", async () => {
    server.use(
      http.get("/api/v1/notifications/unread-count", () => HttpResponse.json({ count: 5 }))
    )

    renderWithProviders(<NotificationBell />)

    expect(await screen.findByText("5")).toBeInTheDocument()
  })

  it("hides the badge when there are no unread notifications", async () => {
    server.use(
      http.get("/api/v1/notifications/unread-count", () => HttpResponse.json({ count: 0 }))
    )

    renderWithProviders(<NotificationBell />)

    // The bell itself always renders; wait for it, then assert no count badge.
    await screen.findByRole("button", { name: /notifications/i })
    await waitFor(() => {
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
    })
  })
})
