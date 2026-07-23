import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { CategoriesPage } from "@/features/admin/pages/categories-page"
import { server } from "@/test/mocks/server"
import { renderWithProviders, screen, waitFor } from "@/test/test-utils"

const CATEGORIES = [
  { categoryId: 1, code: "SciFi", name: "Sci-Fi", icon: "Rocket", active: true, sortOrder: 1, bookCount: 3 },
  { categoryId: 2, code: "SliceOfLife", name: "Slice of Life", icon: null, active: false, sortOrder: 2, bookCount: 0 },
]

describe("Admin CategoriesPage", () => {
  it("lists every category with its book count and status", async () => {
    server.use(http.get("/api/v1/admin/categories", () => HttpResponse.json(CATEGORIES)))
    renderWithProviders(<CategoriesPage />)

    expect(await screen.findByText("Sci-Fi")).toBeInTheDocument()
    expect(screen.getByText("Slice of Life")).toBeInTheDocument()
    // The code column carries the immutable wire value, distinct from the label.
    expect(screen.getByText("SciFi")).toBeInTheDocument()
    // The retired category is badged so an admin can tell it is out of the pickers.
    expect(screen.getByText("Retired")).toBeInTheDocument()
  })

  it("creates a category, deriving the permanent code from the name", async () => {
    const user = userEvent.setup()
    let posted: Record<string, unknown> | undefined
    server.use(
      http.get("/api/v1/admin/categories", () => HttpResponse.json(CATEGORIES)),
      http.post("/api/v1/admin/categories", async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...posted, categoryId: 3, active: true, bookCount: 0 }, { status: 201 })
      }),
    )
    renderWithProviders(<CategoriesPage />)

    await user.click(await screen.findByRole("button", { name: /add category/i }))
    await user.type(screen.getByLabelText(/^name$/i), "Slice of Life")
    // Icons come from a fixed registry, so the payload carries a name the client can resolve.
    await user.click(screen.getByRole("radio", { name: "Coffee" }))
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => expect(posted).toBeDefined())
    expect(posted).toMatchObject({ code: "SliceOfLife", name: "Slice of Life", icon: "Coffee" })
  })

  it("locks the code when editing an existing category", async () => {
    const user = userEvent.setup()
    server.use(http.get("/api/v1/admin/categories", () => HttpResponse.json(CATEGORIES)))
    renderWithProviders(<CategoriesPage />)

    await screen.findByText("Sci-Fi")
    // Open the first row's ⋮ menu, then Edit.
    await user.click(screen.getAllByRole("button", { name: /actions/i })[0])
    await user.click(await screen.findByRole("menuitem", { name: /edit/i }))

    expect(await screen.findByLabelText(/^code$/i)).toBeDisabled()
    // The row's current icon comes back selected.
    expect(screen.getByRole("radio", { name: "Rocket" })).toHaveAttribute("aria-checked", "true")
  })
})
