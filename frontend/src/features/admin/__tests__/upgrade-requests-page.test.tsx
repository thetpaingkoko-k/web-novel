import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { UpgradeRequestsPage } from "@/features/admin/pages/upgrade-requests-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderQueue() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <UpgradeRequestsPage />
      <Toaster />
    </QueryClientProvider>
  )
}

describe("UpgradeRequestsPage", () => {
  it("approves an upgrade request via enable_monetization", async () => {
    const user = userEvent.setup()
    let approvedBody: { kind: string } | undefined
    server.use(
      http.put("/api/v1/admin/users/42/approve", async ({ request }) => {
        approvedBody = (await request.json()) as { kind: string }
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderQueue()

    await user.click(await screen.findByRole("button", { name: /approve as professional/i }))

    await waitFor(() => expect(approvedBody).toEqual({ kind: "enable_monetization" }))
    expect(await screen.findByText(/upgraded to professional/i)).toBeInTheDocument()
  })
})
