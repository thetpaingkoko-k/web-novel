import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { UsersQueuePage } from "@/features/admin/pages/users-queue-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersQueuePage />
      <Toaster />
    </QueryClientProvider>
  )
}

const pendingUser = {
  userId: 11,
  username: "novice_pen",
  email: "novice@example.com",
  role: "reader",
  status: "pending",
  careerStage: "hobbyist",
  createdAt: new Date(0).toISOString(),
}

describe("UsersQueuePage", () => {
  it("bans a user after confirmation (FR-1.4)", async () => {
    const user = userEvent.setup()
    let banned: boolean | undefined
    server.use(
      http.get("/api/v1/admin/users", () => HttpResponse.json([pendingUser])),
      http.put("/api/v1/admin/users/11/suspend", async ({ request }) => {
        banned = ((await request.json()) as { ban: boolean }).ban
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderQueue()

    await user.click(await screen.findByRole("button", { name: /^ban$/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^ban$/i }))

    await waitFor(() => expect(banned).toBe(true))
    expect(await screen.findByText(/user banned/i)).toBeInTheDocument()
  })
})
