import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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

interface FillOptions {
  password?: string
  confirmPassword?: string
  gender?: boolean
  birthday?: string
  acceptTerms?: boolean
}

async function fillForm({
  password = "password123",
  confirmPassword = "password123",
  gender = true,
  birthday = "2000-01-15",
  acceptTerms = true,
}: FillOptions = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Username"), "new_reader")
  await user.type(screen.getByLabelText("Email"), "reader@example.com")
  await user.type(screen.getByLabelText("Password"), password)
  await user.type(screen.getByLabelText("Confirm password"), confirmPassword)
  if (gender) {
    await user.click(screen.getByRole("combobox", { name: "Gender" }))
    await user.click(screen.getByRole("option", { name: "Female" }))
  }
  if (birthday) {
    fireEvent.change(screen.getByLabelText("Birthday"), { target: { value: birthday } })
  }
  if (acceptTerms) {
    await user.click(screen.getByRole("checkbox"))
  }
  await user.click(screen.getByRole("button", { name: /^register$/i }))
  return user
}

describe("RegisterPage", () => {
  it("shows a field error when the passwords don't match", async () => {
    renderRegisterPage()
    await fillForm({ password: "password123", confirmPassword: "password124" })

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument()
    expect(screen.queryByText("verify page")).not.toBeInTheDocument()
  })

  it("blocks submission until the terms are accepted", async () => {
    renderRegisterPage()
    await fillForm({ acceptTerms: false })

    expect(await screen.findByText(/must accept the terms/i)).toBeInTheDocument()
    expect(screen.queryByText("verify page")).not.toBeInTheDocument()
  })

  it("submits gender, birthday and acceptedTerms (without confirmPassword)", async () => {
    let captured: unknown = null
    server.use(
      http.post("/api/v1/auth/register", async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({ email: "reader@example.com", verificationRequired: true })
      })
    )

    renderRegisterPage()
    await fillForm()

    expect(await screen.findByText("verify page")).toBeInTheDocument()
    await waitFor(() => expect(captured).not.toBeNull())
    expect(captured).toEqual({
      username: "new_reader",
      email: "reader@example.com",
      password: "password123",
      gender: "female",
      birthday: "2000-01-15",
      acceptedTerms: true,
    })
    expect(captured).not.toHaveProperty("confirmPassword")
  })
})
