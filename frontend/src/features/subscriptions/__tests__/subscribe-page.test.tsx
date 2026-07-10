import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { SubscribePage } from "@/features/subscriptions/subscribe-page"
import "@/i18n"

function renderSubscribePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/authors/10/subscribe"]}>
        <Routes>
          <Route path="/authors/:authorId/subscribe" element={<SubscribePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("SubscribePage", () => {
  it("shows the author's price and wallet after loading", async () => {
    renderSubscribePage()

    expect(await screen.findByText(/5000 MMK/i)).toBeInTheDocument()
    expect(screen.getByText(/KBZPay/)).toBeInTheDocument()
  })

  it("shows a pending-review state after a valid submission", async () => {
    const user = userEvent.setup()
    renderSubscribePage()

    await screen.findByText(/5000 MMK/i)
    await user.type(screen.getByLabelText(/last 6 digits/i), "123456")
    await user.type(screen.getByLabelText(/screenshot url/i), "https://example.com/receipt.png")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    expect(await screen.findByText(/awaiting admin review/i)).toBeInTheDocument()
  })
})
