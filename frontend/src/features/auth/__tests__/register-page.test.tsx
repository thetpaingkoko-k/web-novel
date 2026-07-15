import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "@/features/auth/auth-context"
import { RegisterPage } from "@/features/auth/register-page"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderRegisterPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<div>verify page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

async function fillForm(password: string, confirmPassword: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Username"), "new_reader")
  await user.type(screen.getByLabelText("Email"), "reader@example.com")
  await user.type(screen.getByLabelText("Password"), password)
  await user.type(screen.getByLabelText("Confirm password"), confirmPassword)
  await user.click(screen.getByRole("button", { name: /^register$/i }))
  return user
}

describe("RegisterPage", () => {
  it("shows a field error when the passwords don't match", async () => {
    renderRegisterPage()
    await fillForm("password123", "password124")

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument()
    expect(screen.queryByText("verify page")).not.toBeInTheDocument()
  })

  it("submits without confirmPassword and moves on to verification", async () => {
    let captured: unknown = null
    server.use(
      http.post("/api/v1/auth/register", async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({ email: "reader@example.com", verificationRequired: true })
      })
    )

    renderRegisterPage()
    await fillForm("password123", "password123")

    expect(await screen.findByText("verify page")).toBeInTheDocument()
    await waitFor(() => expect(captured).not.toBeNull())
    expect(captured).toEqual({
      username: "new_reader",
      email: "reader@example.com",
      password: "password123",
    })
    expect(captured).not.toHaveProperty("confirmPassword")
  })
})
