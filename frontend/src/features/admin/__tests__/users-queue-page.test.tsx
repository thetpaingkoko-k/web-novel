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
  careerStage: null,
  bio: null,
  writingMotivation: null,
  writingInterests: null,
}

const applicant = {
  userId: 12,
  username: "aspiring_ann",
  email: "ann@example.com",
  role: "hobbyist_author",
  status: "pending",
  careerStage: "hobbyist",
  bio: "I have written fan fiction for years.",
  writingMotivation: "I want to share the stories in my head.",
  writingInterests: "Slow-burn fantasy romance.",
}

describe("UsersQueuePage", () => {
  it("shows the Verify control and reveals onboarding answers via View details", async () => {
    const user = userEvent.setup()
    server.use(http.get("/api/v1/admin/users", () => HttpResponse.json([applicant])))

    renderQueue()

    // The primary approval control is visible right on the row.
    expect(await screen.findByRole("button", { name: /verify author/i })).toBeInTheDocument()

    // The application answers are one click away, behind View details.
    await user.click(screen.getByRole("button", { name: /^actions$/i }))
    await user.click(await screen.findByRole("menuitem", { name: /view details/i }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/written fan fiction for years/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/stories in my head/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/slow-burn fantasy romance/i)).toBeInTheDocument()
  })

  it("bans a user with a required reason (FR-1.4)", async () => {
    const user = userEvent.setup()
    let sent: { ban: boolean; reason: string } | undefined
    server.use(
      http.get("/api/v1/admin/users", () => HttpResponse.json([pendingUser])),
      http.put("/api/v1/admin/users/11/suspend", async ({ request }) => {
        sent = (await request.json()) as { ban: boolean; reason: string }
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderQueue()

    await user.click(await screen.findByRole("button", { name: /^actions$/i }))
    await user.click(await screen.findByRole("menuitem", { name: /^ban$/i }))

    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Reason"), "Fraudulent activity")
    await user.click(within(dialog).getByRole("button", { name: /^ban$/i }))

    await waitFor(() => expect(sent).toEqual({ ban: true, reason: "Fraudulent activity" }))
    expect(await screen.findByText(/user banned/i)).toBeInTheDocument()
  })
})
