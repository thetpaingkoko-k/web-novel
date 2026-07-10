import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { LoginPage } from "@/features/auth/login-page"
import "@/i18n"

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("LoginPage", () => {
  it("shows a validation error for an invalid email", async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), "not-an-email")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it("logs in successfully with valid credentials", async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), "reader@example.com")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
  })
})
