import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { tokenStorage } from "@/api/client"
import { AuthProvider } from "@/features/auth/auth-context"
import { ChapterEditorPage } from "@/features/author/chapter-editor-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderCreateChapter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/author/books/7/chapters/new"]}>
          <Routes>
            <Route path="/author/books/:bookId/chapters/new" element={<ChapterEditorPage />} />
            <Route path="/author/books/:bookId/edit" element={<div>book editor</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("ChapterEditorPage publish", () => {
  it("publishes a brand-new chapter on the FIRST click (regression: no /chapters/NaN/publish)", async () => {
    const user = userEvent.setup()
    tokenStorage.setTokens("token", "refresh")

    const publishUrls: string[] = []
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({
          userId: 5,
          username: "hobbyist1",
          email: "hobbyist@example.com",
          role: "hobbyist_author",
          status: "approved",
          isMonetizationEnabled: false,
        })
      ),
      http.post("/api/v1/books/:bookId/chapters", () =>
        HttpResponse.json({
          chapterId: 42,
          bookId: 7,
          chapterNumber: 1,
          title: "My Chapter",
          content: "Some content here.",
          status: "draft",
          likeCount: 0,
          uniqueViewCount: 0,
          completionCount: 0,
          rejectionReason: null,
          publishedAt: null,
          likedByMe: false,
        })
      ),
      http.post("/api/v1/chapters/:id/publish", ({ params }) => {
        publishUrls.push(String(params.id))
        return HttpResponse.json({
          chapterId: 42,
          bookId: 7,
          chapterNumber: 1,
          title: "My Chapter",
          content: "Some content here.",
          status: "pending_review",
          likeCount: 0,
          uniqueViewCount: 0,
          completionCount: 0,
          rejectionReason: null,
          publishedAt: null,
          likedByMe: false,
        })
      })
    )

    renderCreateChapter()

    await user.type(await screen.findByLabelText(/title/i), "My Chapter")
    await user.type(screen.getByLabelText(/content/i), "Some content here.")
    await user.click(screen.getByRole("button", { name: /publish|submit for review/i }))

    // The publish must hit the real created id (42), never NaN/undefined,
    // and it must succeed on the first click (navigates to the book editor).
    await waitFor(() => expect(screen.getByText("book editor")).toBeInTheDocument())
    expect(publishUrls).toEqual(["42"])
  })
})
