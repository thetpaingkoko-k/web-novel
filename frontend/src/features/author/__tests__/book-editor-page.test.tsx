import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { tokenStorage } from "@/api/client"
import { BookEditorPage } from "@/features/author/book-editor-page"
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
})
