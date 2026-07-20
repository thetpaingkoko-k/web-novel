import { describe, expect, it } from "vitest"
import { formatVotes } from "@/lib/format"

describe("formatVotes", () => {
  it("shows small scores verbatim, including negatives and zero", () => {
    expect(formatVotes(0)).toBe("0")
    expect(formatVotes(1)).toBe("1")
    expect(formatVotes(999)).toBe("999")
    expect(formatVotes(-42)).toBe("-42")
  })

  it("abbreviates thousands with one decimal, dropping a trailing .0", () => {
    expect(formatVotes(1000)).toBe("1k")
    expect(formatVotes(1200)).toBe("1.2k")
    expect(formatVotes(12345)).toBe("12.3k")
    expect(formatVotes(-1200)).toBe("-1.2k")
  })

  it("abbreviates millions", () => {
    expect(formatVotes(1_000_000)).toBe("1m")
    expect(formatVotes(2_500_000)).toBe("2.5m")
  })
})
