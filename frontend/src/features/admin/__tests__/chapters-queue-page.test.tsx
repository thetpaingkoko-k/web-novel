import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { ChaptersQueuePage } from "@/features/admin/pages/chapters-queue-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ChaptersQueuePage />
      <Toaster />
    </QueryClientProvider>
  )
}

const pendingChapter = {
  chapterId: 100,
  bookId: 1,
  bookTitle: "The Last Ember",
  authorUsername: "hobbyist1",
  chapterNumber: 2,
  title: "Ashfall",
  status: "pending_review",
}

describe("ChaptersQueuePage", () => {
  it("approves a pending chapter", async () => {
    const user = userEvent.setup()
    let approved = false
    server.use(
      http.get("/api/v1/admin/chapters", () => HttpResponse.json([pendingChapter])),
      http.put("/api/v1/admin/chapters/100/approve", () => {
        approved = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderQueue()

    await user.click(await screen.findByRole("button", { name: /^approve$/i }))

    await waitFor(() => expect(approved).toBe(true))
    expect(await screen.findByText(/chapter approved/i)).toBeInTheDocument()
  })

  it("lazily loads chapter content for review via GET /chapters/{id}", async () => {
    const user = userEvent.setup()
    let detailRequested = false
    server.use(
      http.get("/api/v1/admin/chapters", () => HttpResponse.json([pendingChapter])),
      http.get("/api/v1/chapters/100", () => {
        detailRequested = true
        return HttpResponse.json({
          chapterId: 100,
          bookId: 1,
          chapterNumber: 2,
          title: "Ashfall",
          content: "Ash rained over the valley.",
          status: "pending_review",
          likeCount: 0,
          uniqueViewCount: 0,
          completionCount: 0,
          publishedAt: null,
          rejectionReason: null,
          likedByMe: false,
        })
      })
    )

    renderQueue()

    // Content is not fetched until the review dialog is opened from the row menu.
    await user.click(await screen.findByRole("button", { name: /^actions$/i }))
    await user.click(await screen.findByRole("menuitem", { name: /review content/i }))

    expect(await screen.findByText(/ash rained over the valley/i)).toBeInTheDocument()
    expect(detailRequested).toBe(true)
  })

  it("rejects a chapter with a required reason (FR-3.3)", async () => {
    const user = userEvent.setup()
    let rejectedReason: string | undefined
    server.use(
      http.get("/api/v1/admin/chapters", () => HttpResponse.json([pendingChapter])),
      http.put("/api/v1/admin/chapters/100/reject", async ({ request }) => {
        rejectedReason = ((await request.json()) as { reason: string }).reason
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderQueue()

    // Open the reject dialog from the row's ⋮ action menu.
    await user.click(await screen.findByRole("button", { name: /^actions$/i }))
    await user.click(await screen.findByRole("menuitem", { name: /^reject$/i }))

    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText(/reason/i), "Formatting is broken")
    await user.click(within(dialog).getByRole("button", { name: /reject/i }))

    await waitFor(() => expect(rejectedReason).toBe("Formatting is broken"))
  })
})
