import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { BookAudioPlaylist } from "@/features/books/components/book-audio-playlist"
import { server } from "@/test/mocks/server"
import { renderWithProviders, screen, waitFor } from "@/test/test-utils"

const BOOK_ID = 1
const AUTHOR_ID = 10

function playlist(tracks: unknown[]) {
  server.use(http.get(`/api/v1/books/${BOOK_ID}/audio-playlist`, () => HttpResponse.json(tracks)))
}

describe("BookAudioPlaylist", () => {
  it("renders nothing when no chapter has narration audio", async () => {
    playlist([])
    const { container } = renderWithProviders(
      <BookAudioPlaylist bookId={BOOK_ID} authorId={AUTHOR_ID} />,
    )

    await waitFor(() => expect(container.querySelector("section")).toBeNull())
  })

  it("lists narrated chapters as tracks", async () => {
    playlist([
      { chapterId: 1, chapterNumber: 1, title: "The Ember", audioUrl: "/uploads/audio/a.mp3", locked: false },
      { chapterId: 2, chapterNumber: 2, title: "The Ash", audioUrl: "/uploads/audio/b.mp3", locked: false },
    ])
    renderWithProviders(<BookAudioPlaylist bookId={BOOK_ID} authorId={AUTHOR_ID} />)

    expect(await screen.findByText(/Ch. 1 · The Ember/)).toBeInTheDocument()
    expect(screen.getByText(/Ch. 2 · The Ash/)).toBeInTheDocument()
    expect(screen.getByText("2 narrated chapters")).toBeInTheDocument()
  })

  it("disables a locked track and points it at the subscribe flow", async () => {
    playlist([
      { chapterId: 1, chapterNumber: 1, title: "Free preview", audioUrl: "/uploads/audio/a.mp3", locked: false },
      { chapterId: 2, chapterNumber: 2, title: "Paywalled", audioUrl: null, locked: true },
    ])
    renderWithProviders(<BookAudioPlaylist bookId={BOOK_ID} authorId={AUTHOR_ID} />)

    // The locked chapter is listed but is not a playable button.
    expect(await screen.findByText(/Ch. 2 · Paywalled/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Ch. 2 · Paywalled/ })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /subscribe/i })).toHaveAttribute(
      "href",
      `/authors/${AUTHOR_ID}/subscribe`,
    )
  })
})
