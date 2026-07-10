import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/ui/sonner"
import { CreateThreadDialog } from "@/features/debates/components/create-thread-dialog"
import { server } from "@/test/mocks/server"
import "@/i18n"

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateThreadDialog bookId={1} />
      <Toaster />
    </QueryClientProvider>
  )
}

describe("CreateThreadDialog", () => {
  it("surfaces the per-book window-full message on a 409 book_window_full", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/v1/books/1/debates", () =>
        HttpResponse.json({ reason: "book_window_full" }, { status: 409 })
      )
    )

    renderDialog()

    await user.click(screen.getByRole("button", { name: /start a discussion/i }))
    await user.type(screen.getByLabelText(/discussion title/i), "Is chapter 5 a twist?")
    await user.click(screen.getByRole("button", { name: /create/i }))

    expect(await screen.findByText(/reached its discussion limit/i)).toBeInTheDocument()
  })

  it("surfaces the one-per-book message on a 409 already_has_thread", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/v1/books/1/debates", () =>
        HttpResponse.json({ reason: "already_has_thread" }, { status: 409 })
      )
    )

    renderDialog()

    await user.click(screen.getByRole("button", { name: /start a discussion/i }))
    await user.type(screen.getByLabelText(/discussion title/i), "My take")
    await user.click(screen.getByRole("button", { name: /create/i }))

    expect(await screen.findByText(/already have a discussion/i)).toBeInTheDocument()
  })
})
