import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { CommentItem } from "@/features/chapters/components/comment-item"
import type { CommentWithReplies } from "@/types/engagement"
import { server } from "@/test/mocks/server"
import "@/i18n"

/** Sign in a reader with a known id so ownership can be resolved. */
function authenticateReader(userId: number) {
  localStorage.setItem("webnovel_access_token", "test-access-token")
  localStorage.setItem("webnovel_refresh_token", "test-refresh-token")
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        userId,
        username: "reader1",
        email: "reader@example.com",
        role: "reader",
        status: "approved",
        isMonetizationEnabled: false,
      })
    )
  )
}

/** Sign in an admin (moderator). */
function authenticateAdmin() {
  localStorage.setItem("webnovel_access_token", "test-access-token")
  localStorage.setItem("webnovel_refresh_token", "test-refresh-token")
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        userId: 99,
        username: "admin",
        email: "admin@example.com",
        role: "admin",
        status: "approved",
        isMonetizationEnabled: false,
      })
    )
  )
}

function makeComment(overrides: Partial<CommentWithReplies> = {}): CommentWithReplies {
  return {
    commentId: 1,
    chapterId: 100,
    readerId: 1,
    readerUsername: "reader1",
    parentCommentId: null,
    content: "A thoughtful take.",
    spoilerFlagged: false,
    status: "visible",
    createdAt: new Date(0).toISOString(),
    replies: [],
    ...overrides,
  }
}

function renderCommentItem(comment: CommentWithReplies) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <CommentItem comment={comment} chapterId={100} />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("CommentItem", () => {
  afterEach(() => localStorage.clear())

  it("offers Delete (not Report) on the reader's own comment", async () => {
    authenticateReader(1)
    renderCommentItem(makeComment({ readerId: 1 }))

    expect(await screen.findByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /report/i })).not.toBeInTheDocument()
  })

  it("offers Report (not Delete) on another reader's comment", async () => {
    authenticateReader(1)
    renderCommentItem(makeComment({ readerId: 2 }))

    expect(await screen.findByRole("button", { name: /report/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
  })

  it("offers Hide (not reply/report) to an admin on a visible comment", async () => {
    authenticateAdmin()
    renderCommentItem(makeComment({ readerId: 2 }))

    expect(await screen.findByRole("button", { name: /hide/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /report/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /reply/i })).not.toBeInTheDocument()
  })

  it("shows a hidden comment to an admin with its content, a moderated label, and Unhide", async () => {
    authenticateAdmin()
    renderCommentItem(makeComment({ readerId: 2, status: "hidden", content: "Borderline take." }))

    expect(await screen.findByRole("button", { name: /unhide/i })).toBeInTheDocument()
    expect(screen.getByText(/hidden by moderator/i)).toBeInTheDocument()
    // The content stays visible so the admin can judge it.
    expect(screen.getByText(/borderline take/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^hide$/i })).not.toBeInTheDocument()
  })

  it("hides a stray hidden comment from non-admins, keeping replies", () => {
    authenticateReader(1)
    renderCommentItem(
      makeComment({
        status: "hidden",
        content: "should not leak",
        replies: [makeComment({ commentId: 2, readerId: 2, content: "A surviving reply." })],
      })
    )

    expect(screen.queryByText(/should not leak/i)).not.toBeInTheDocument()
    expect(screen.getByText(/\[deleted\]/i)).toBeInTheDocument()
    expect(screen.getByText(/a surviving reply/i)).toBeInTheDocument()
  })

  it("renders a removed comment as a muted placeholder while keeping its replies", () => {
    renderCommentItem(
      makeComment({
        status: "removed",
        content: "",
        replies: [makeComment({ commentId: 2, readerId: 2, content: "A surviving reply." })],
      })
    )

    expect(screen.getByText(/\[deleted\]/i)).toBeInTheDocument()
    expect(screen.getByText(/a surviving reply/i)).toBeInTheDocument()
  })
})
