import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProgressRing } from "@/components/progress-ring"

describe("ProgressRing", () => {
  it("renders the rounded percentage and an accessible label", () => {
    render(<ProgressRing value={3 / 4} label="3 of 4 chapters read" />)
    expect(screen.getByText("75%")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /3 of 4 chapters read/i })).toBeInTheDocument()
  })

  it("clamps out-of-range and non-finite values", () => {
    const { rerender } = render(<ProgressRing value={5} />)
    expect(screen.getByText("100%")).toBeInTheDocument()
    rerender(<ProgressRing value={Number.NaN} />)
    expect(screen.getByText("0%")).toBeInTheDocument()
  })
})
