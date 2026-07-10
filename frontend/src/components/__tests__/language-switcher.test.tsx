import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { LanguageSwitcher } from "@/components/language-switcher"
import i18n from "@/i18n"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("LanguageSwitcher", () => {
  it("changes the active language to Myanmar", async () => {
    const user = userEvent.setup()
    renderWithProviders(<LanguageSwitcher />)

    await user.click(screen.getByRole("button", { name: /language/i }))
    await user.click(await screen.findByText("မြန်မာ"))

    expect(i18n.language).toBe("my")
  })
})
