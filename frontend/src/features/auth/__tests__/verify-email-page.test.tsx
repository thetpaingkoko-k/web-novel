import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { VerifyEmailPage } from "@/features/auth/verify-email-page"
import "@/i18n"

function renderVerifyPage(initialEntries: InitialEntry[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/" element={<div>home page</div>} />
            <Route path="/register" element={<div>register page</div>} />
            <Route path="/login" element={<div>login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

const withEmail = (email = "new@example.com"): InitialEntry[] => [
  { pathname: "/verify-email", state: { email } },
]

describe("VerifyEmailPage", () => {
  it("verifies the code and lands on home", async () => {
    const user = userEvent.setup()
    renderVerifyPage(withEmail())

    await user.type(screen.getByLabelText("Verification code"), "123456")
    await user.click(screen.getByRole("button", { name: /verify & continue/i }))

    expect(await screen.findByText("home page")).toBeInTheDocument()
  })

  it("stays on the page when the code is wrong", async () => {
    const user = userEvent.setup()
    renderVerifyPage(withEmail())

    await user.type(screen.getByLabelText("Verification code"), "000000")
    await user.click(screen.getByRole("button", { name: /verify & continue/i }))

    // No navigation to home; the verify screen is still shown.
    expect(await screen.findByRole("button", { name: /verify & continue/i })).toBeInTheDocument()
    expect(screen.queryByText("home page")).not.toBeInTheDocument()
  })

  it("auto-sends a code on mount and starts a cooldown", async () => {
    renderVerifyPage(withEmail())

    // No click needed: reaching the page sends the code and disables "resend"
    // until the cooldown elapses.
    expect(await screen.findByRole("button", { name: /resend in/i })).toBeDisabled()
  })

  it("redirects to register when no email was provided", async () => {
    renderVerifyPage(["/verify-email"])
    expect(await screen.findByText("register page")).toBeInTheDocument()
  })
})
