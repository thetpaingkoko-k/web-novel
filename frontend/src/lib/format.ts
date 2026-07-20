/**
 * Reddit-style compact vote score: 1..999 shown as-is, then abbreviated to
 * one decimal (1.2k, 12.3k, 1.0m). Negatives keep their sign (-1.2k).
 */
export function formatVotes(score: number): string {
  const sign = score < 0 ? "-" : ""
  const n = Math.abs(score)
  if (n < 1_000) return `${score}`
  if (n < 1_000_000) return `${sign}${trim(n / 1_000)}k`
  return `${sign}${trim(n / 1_000_000)}m`
}

/** One decimal place, dropping a trailing ".0" (1.0k → 1k, 1.2k stays). */
function trim(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "")
}
