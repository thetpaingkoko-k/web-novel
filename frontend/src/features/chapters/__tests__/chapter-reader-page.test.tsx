import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { ChapterReaderPage } from "@/features/chapters/chapter-reader-page"
import "@/i18n"
import { server } from "@/test/mocks/server"

function renderChapterReader(chapterId: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/chapters/${chapterId}`]}>
          <Routes>
            <Route path="/chapters/:chapterId" element={<ChapterReaderPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("ChapterReaderPage", () => {
  it("shows a subscribe prompt naming the author on a 403 no_subscription response", async () => {
    server.use(
      http.get("/api/v1/chapters/999", () =>
        HttpResponse.json(
          { reason: "no_subscription", authorId: 42, authorUsername: "moonlight_writer" },
          { status: 403 }
        )
      )
    )

    renderChapterReader(999)

    expect(await screen.findByText(/subscribe to keep reading/i)).toBeInTheDocument()
    expect(screen.getAllByText(/moonlight_writer/).length).toBeGreaterThan(0)
  })

  it("renders chapter content and the comments section for an accessible chapter", async () => {
    server.use(
      http.get("/api/v1/chapters/100", () =>
        HttpResponse.json({
          chapterId: 100,
          bookId: 1,
          chapterNumber: 1,
          title: "Sparks",
          content: "The ember caught.",
          status: "published",
          likeCount: 2,
          uniqueViewCount: 10,
          completionCount: 1,
          publishedAt: new Date(0).toISOString(),
          rejectionReason: null,
          likedByMe: false,
        })
      ),
      http.post("/api/v1/chapters/100/view", () => new HttpResponse(null, { status: 204 })),
      http.get("/api/v1/chapters/100/comments", () => HttpResponse.json([])),
    )

    renderChapterReader(100)

    expect(await screen.findByText(/the ember caught/i)).toBeInTheDocument()
    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument()
  })
})
