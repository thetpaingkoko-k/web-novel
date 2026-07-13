import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { LoginPage } from "@/features/auth/login-page"
import "@/i18n"

function renderLoginPage(initialEntries: InitialEntry[] = ["/login"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>home page</div>} />
            <Route path="/authors/:id/subscribe" element={<div>subscribe page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

async function submitValidCredentials() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email/i), "reader@example.com")
  await user.type(screen.getByLabelText(/password/i), "password123")
  await user.click(screen.getByRole("button", { name: /log in/i }))
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
    renderLoginPage()
    await submitValidCredentials()

    expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
  })

  it("redirects to the page the user came from after login", async () => {
    renderLoginPage([
      {
        pathname: "/login",
        state: { from: { pathname: "/authors/10/subscribe", search: "", hash: "" } },
      },
    ])
    await submitValidCredentials()

    expect(await screen.findByText("subscribe page")).toBeInTheDocument()
    expect(screen.queryByText("home page")).not.toBeInTheDocument()
  })

  it("redirects to home after login when there is no origin page", async () => {
    renderLoginPage()
    await submitValidCredentials()

    expect(await screen.findByText("home page")).toBeInTheDocument()
  })
})
