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
  avatarUrl: null,
  gender: "female",
  dateOfBirth: "1998-04-12",
  createdAt: "2024-01-15T08:30:00Z",
}

const AUTHOR: AuthUser = {
  userId: 10,
  username: "moonlight_writer",
  email: "author@example.com",
  role: "hobbyist_author",
  status: "approved",
  isMonetizationEnabled: false,
  avatarUrl: null,
  gender: null,
  dateOfBirth: null,
  createdAt: "2024-01-15T08:30:00Z",
}

const AUTHOR_ME = {
  authorId: 10,
  username: "moonlight_writer",
  bio: "Writes about embers.",
  careerStage: "hobbyist",
  isMonetizationEnabled: false,
  monthlySubscriptionPrice: null,
  payoutWalletProvider: null,
  payoutWalletNumber: null,
  writingMotivation: null,
  writingInterests: null,
  availableBalance: 0,
  totalEarned: 0,
  professionalRequested: false,
  professionalRequestedAt: null,
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

  it("prefills and saves an updated username via PUT /users/me (no email in body)", async () => {
    tokenStorage.setTokens("access", "refresh")
    let savedBody: Record<string, unknown> | undefined
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(READER)),
      http.put("/api/v1/users/me", async ({ request }) => {
        savedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...READER, username: savedBody.username as string })
      })
    )
    const user = userEvent.setup()

    renderPage()

    const username = (await screen.findByLabelText(/username/i)) as HTMLInputElement
    await waitFor(() => expect(username.value).toBe("reader_rin"))

    await user.clear(username)
    await user.type(username, "rin_writes")
    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => expect(savedBody).toBeDefined())
    expect(savedBody).toEqual({ username: "rin_writes", avatarUrl: null })
    expect(savedBody).not.toHaveProperty("email")
    expect(await screen.findByText(/profile updated/i)).toBeInTheDocument()
  })

  it("shows the email as read-only (no editable email input)", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json(READER)))

    renderPage()

    const email = (await screen.findByLabelText(/email/i)) as HTMLInputElement
    await waitFor(() => expect(email.value).toBe("rin@example.com"))
    expect(email).toHaveAttribute("readonly")
  })

  it("displays the full account detail (gender, birthday, member-since, role)", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json(READER)))

    renderPage()

    // Read-only detail labels + formatted values (wait for /users/me to load).
    expect(await screen.findByText(/^Female$/)).toBeInTheDocument()
    expect(screen.getByText(/member since/i)).toBeInTheDocument()
    // Localized long dates for birthday (1998) and member-since (2024).
    expect(screen.getByText(/1998/)).toBeInTheDocument()
    expect(screen.getByText(/2024/)).toBeInTheDocument()
    // Role badge from the membership detail.
    expect(screen.getByText(/^Reader$/)).toBeInTheDocument()
  })

  it("lists the reader's subscriptions from /subscriptions/me", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(READER)),
      http.get("/api/v1/subscriptions/me", () =>
        HttpResponse.json([
          {
            subscriptionId: 9,
            authorId: 10,
            authorUsername: "moonlight_writer",
            status: "active",
            startDate: "2026-07-01",
            endDate: "2026-08-01",
            priceMmk: 5000,
          },
        ])
      )
    )

    renderPage()

    expect(await screen.findByText(/moonlight_writer/i)).toBeInTheDocument()
    expect(screen.getByText(/^Active$/)).toBeInTheDocument()
  })

  it("does not show the author bio card for readers", async () => {
    tokenStorage.setTokens("access", "refresh")
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json(READER)))

    renderPage()

    // Wait for the profile form to load, then assert no bio card.
    await screen.findByLabelText(/username/i)
    expect(screen.queryByText(/author bio/i)).not.toBeInTheDocument()
  })

  it("loads an author's bio and saves it via PUT /authors/me { bio }", async () => {
    tokenStorage.setTokens("access", "refresh")
    let savedBody: Record<string, unknown> | undefined
    server.use(
      http.get("/api/v1/users/me", () => HttpResponse.json(AUTHOR)),
      http.get("/api/v1/authors/me", () => HttpResponse.json(AUTHOR_ME)),
      http.put("/api/v1/authors/me", async ({ request }) => {
        savedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...AUTHOR_ME, bio: savedBody.bio as string })
      })
    )
    const user = userEvent.setup()

    renderPage()

    const bio = (await screen.findByLabelText(/about you/i)) as HTMLTextAreaElement
    await waitFor(() => expect(bio.value).toBe("Writes about embers."))

    await user.clear(bio)
    await user.type(bio, "Now writing about frost.")
    // The bio card has its own Save button; grab the last Save on the page.
    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => expect(savedBody).toBeDefined())
    expect(savedBody).toEqual({ bio: "Now writing about frost." })
    expect(await screen.findByText(/bio updated/i)).toBeInTheDocument()
  })
})
