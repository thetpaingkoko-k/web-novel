import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ModeToggle } from "@/components/mode-toggle"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("ModeToggle", () => {
  it("switches to dark mode when Dark is selected", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ModeToggle />)

    await user.click(screen.getByRole("button", { name: /toggle theme/i }))
    await user.click(await screen.findByText(/dark/i))

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})
