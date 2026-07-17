import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { tokenStorage } from "@/api/client"
import { BookEditorPage } from "@/features/author/book-editor-page"
import { mockBookDetail } from "@/test/mocks/handlers"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderBookEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/author/books/new"]}>
          <Routes>
            <Route path="/author/books/new" element={<BookEditorPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function renderBookEditorEdit() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/author/books/1/edit"]}>
          <Routes>
            <Route path="/author/books/:bookId/edit" element={<BookEditorPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("BookEditorPage", () => {
  it("shows a validation error when title is left empty", async () => {
    const user = userEvent.setup()
    renderBookEditor()

    await user.click(screen.getByRole("button", { name: /save/i }))

    expect(await screen.findByText(/required/i)).toBeInTheDocument()
  })

  it("disables the premium switch when monetization is not enabled", async () => {
    tokenStorage.setTokens("token", "refresh")
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
      )
    )

    renderBookEditor()

    expect(await screen.findByLabelText(/premium book/i)).toBeDisabled()
  })

  it("renders the title as read-only text (not an input) in edit mode and omits it from the update payload", async () => {
    tokenStorage.setTokens("token", "refresh")
    let savedBody: Record<string, unknown> | undefined
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({
          userId: 10,
          username: "moonlight_writer",
          email: "author@example.com",
          role: "professional_author",
          status: "approved",
          isMonetizationEnabled: true,
        })
      ),
      http.put("/api/v1/books/:bookId", async ({ request }) => {
        savedBody = (await request.json()) as Record<string, unknown>
        // Mirror the full BookDetailResponse the backend returns (incl. chapters).
        return HttpResponse.json({
          ...mockBookDetail,
          ...savedBody,
          bookId: 1,
          title: "The Last Ember",
        })
      })
    )
    const user = userEvent.setup()

    renderBookEditorEdit()

    // Existing title shows as static text; no editable title input exists.
    expect(await screen.findByText("The Last Ember")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: /^title$/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => expect(savedBody).toBeDefined())
    expect(savedBody).not.toHaveProperty("title")
    expect(savedBody).toHaveProperty("status")
  })
})
