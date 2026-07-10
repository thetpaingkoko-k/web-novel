import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { BooksBrowsePage } from "@/features/books/books-browse-page"
import { server } from "@/test/mocks/server"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("BooksBrowsePage", () => {
  it("renders the mocked book after loading", async () => {
    renderWithProviders(<BooksBrowsePage />)

    expect(await screen.findByText("The Last Ember")).toBeInTheDocument()
  })

  it("shows a designed empty state when no books match", async () => {
    server.use(http.get("/api/v1/books", () => HttpResponse.json([])))
    renderWithProviders(<BooksBrowsePage />)

    expect(await screen.findByText(/no books match/i)).toBeInTheDocument()
  })
})
