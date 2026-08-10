import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { server } from "@/test/mocks/server"
import { renderWithProviders } from "@/test/test-utils"
import type { FeedPost } from "@/types/feed"
import { FeedPostCard } from "../components/feed-post-card"

const post: FeedPost = {
  feedPostId: 7,
  authorId: 10,
  authorUsername: "moonlight_writer",
  authorAvatarUrl: null,
  title: "Chapter 12 is up early",
  content: "Thanks for reading!",
  premiumOnly: false,
  publishedAt: new Date(0).toISOString(),
}

describe("FeedPostCard", () => {
  it("hides the delete action when the viewer can't delete", () => {
    renderWithProviders(<FeedPostCard post={post} />)
    expect(screen.queryByRole("button", { name: /delete post/i })).not.toBeInTheDocument()
  })

  it("deletes the post after confirmation when the viewer can delete", async () => {
    let deletedPath = ""
    server.use(
      http.delete("/api/v1/authors/10/feed/7", () => {
        deletedPath = "/authors/10/feed/7"
        return new HttpResponse(null, { status: 204 })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<FeedPostCard post={post} canDelete />)

    await user.click(screen.getByRole("button", { name: /delete post/i }))
    // Confirm in the dialog (the alert-dialog's confirm action, not the trigger).
    const confirmButtons = await screen.findAllByRole("button", { name: /delete post/i })
    await user.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(deletedPath).toBe("/authors/10/feed/7"))
  })
})
