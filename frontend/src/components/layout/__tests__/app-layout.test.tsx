import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"
import { tokenStorage } from "@/api/client"
import { AppLayout } from "@/components/layout/app-layout"
import { AuthProvider } from "@/features/auth/auth-context"
import { server } from "@/test/mocks/server"
import "@/i18n"

function mockUser(role: string, isMonetizationEnabled = false) {
  tokenStorage.setTokens("token", "refresh")
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        userId: 10,
        username: "moonlight_writer",
        email: "author@example.com",
        role,
        status: "approved",
        isMonetizationEnabled,
      })
    )
  )
}

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>home</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

afterEach(() => tokenStorage.clearTokens())

describe("AppLayout navigation", () => {
  it("shows authors a top-level Studio link and no Author Settings entry", async () => {
    mockUser("hobbyist_author")

    renderLayout()

    const studio = await screen.findByRole("link", { name: /^studio$/i })
    expect(studio).toHaveAttribute("href", "/author/books")
    expect(screen.queryByRole("link", { name: /author settings/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /^settings$/i })).not.toBeInTheDocument()
  })

  it("surfaces a top-level Earnings link for professional authors", async () => {
    mockUser("professional_author", true)

    renderLayout()

    expect(await screen.findByRole("link", { name: /^studio$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /earnings/i })).toHaveAttribute(
      "href",
      "/author/earnings"
    )
  })

  it("does not show the Studio link to readers", async () => {
    mockUser("reader")

    renderLayout()

    // Wait for the account avatar (auth resolved), then assert no Studio link.
    await screen.findByRole("button", { name: /account/i })
    expect(screen.queryByRole("link", { name: /^studio$/i })).not.toBeInTheDocument()
  })

  it("offers Become Professional to an unmonetized hobbyist", async () => {
    const user = userEvent.setup()
    mockUser("hobbyist_author", false)

    renderLayout()

    await user.click(await screen.findByRole("button", { name: /account/i }))
    const item = await screen.findByRole("menuitem", { name: /become professional/i })
    expect(item).toHaveAttribute("href", "/author/books")
  })

  it("does not offer Become Professional to a professional author", async () => {
    const user = userEvent.setup()
    mockUser("professional_author", true)

    renderLayout()

    await user.click(await screen.findByRole("button", { name: /account/i }))
    // The menu is open (Account item present) but no upgrade entry.
    await screen.findByRole("menuitem", { name: /^account$/i })
    expect(
      screen.queryByRole("menuitem", { name: /become professional/i })
    ).not.toBeInTheDocument()
  })
})
