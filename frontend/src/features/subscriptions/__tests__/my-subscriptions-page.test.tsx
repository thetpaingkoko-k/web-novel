import { describe, expect, it } from "vitest"
import { MySubscriptionsPage } from "@/features/subscriptions/my-subscriptions-page"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("MySubscriptionsPage", () => {
  it("shows a designed empty state when the reader has no subscriptions", async () => {
    renderWithProviders(<MySubscriptionsPage />)

    expect(await screen.findByText(/haven't subscribed/i)).toBeInTheDocument()
  })
})
