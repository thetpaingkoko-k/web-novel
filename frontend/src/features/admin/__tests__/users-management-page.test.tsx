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
    role: "reader",
    status: "approved",
    careerStage: null,
    createdAt: new Date(0).toISOString(),
  },
  {
    userId: 5,
    username: "banned_bob",
    email: "bob@example.com",
    role: "reader",
    status: "banned",
    careerStage: null,
    createdAt: new Date(0).toISOString(),
  },
]

describe("UsersManagementPage", () => {
  it("reactivates a banned account (FR-1.4)", async () => {
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

    await user.click(await screen.findByRole("button", { name: /reactivate/i }))

    await waitFor(() => expect(reactivated).toBe(true))
    expect(await screen.findByText(/user reactivated/i)).toBeInTheDocument()
  })

  it("only offers reactivate (not suspend/ban) for a banned user", async () => {
    server.use(
      http.get("/api/v1/admin/users", () =>
        HttpResponse.json([users[1]])
      )
    )

    renderPage()

    expect(await screen.findByRole("button", { name: /reactivate/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^ban$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /suspend/i })).not.toBeInTheDocument()
  })
})
