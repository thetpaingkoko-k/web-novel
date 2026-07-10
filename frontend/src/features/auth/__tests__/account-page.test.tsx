import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router"
import { tokenStorage } from "@/api/client"
import { Toaster } from "@/components/ui/sonner"
import { AccountPage } from "@/features/auth/account-page"
import { AuthProvider } from "@/features/auth/auth-context"
import type { AuthUser } from "@/types/auth"
import { server } from "@/test/mocks/server"
import "@/i18n"

const READER: AuthUser = {
  userId: 1,
  username: "reader_rin",
  email: "rin@example.com",
  role: "reader",
  status: "approved",
  isMonetizationEnabled: false,
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("AccountPage", () => {
  afterEach(() => tokenStorage.clearTokens())

  it("prefills and saves an updated username via PUT /users/me", async () => {
    tokenStorage.setTokens("access", "refresh")
    let savedUsername: string | undefined
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(READER)),
      http.put("/api/v1/users/me", async ({ request }) => {
        const body = (await request.json()) as { username: string }
        savedUsername = body.username
        return HttpResponse.json({ ...READER, username: body.username })
      })
    )
    const user = userEvent.setup()

    renderPage()

    const username = (await screen.findByLabelText(/username/i)) as HTMLInputElement
    await waitFor(() => expect(username.value).toBe("reader_rin"))

    await user.clear(username)
    await user.type(username, "rin_writes")
    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => expect(savedUsername).toBe("rin_writes"))
    expect(await screen.findByText(/profile updated/i)).toBeInTheDocument()
  })
})
