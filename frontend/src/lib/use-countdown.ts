import { useEffect, useState } from "react"

export type CountdownUrgency = "expired" | "urgent" | "soon" | "normal"

export interface Countdown {
  /** Milliseconds remaining until the target instant. Negative once past. */
  remainingMs: number
  expired: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
  /**
   * Coarse severity used to colour the UI:
   * `expired` (past), `urgent` (< 24h), `soon` (< 3 days), `normal`.
   */
  urgency: CountdownUrgency
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function computeCountdown(target: number, now: number): Countdown {
  const remainingMs = target - now
  const expired = remainingMs <= 0
  const abs = Math.max(remainingMs, 0)
  const days = Math.floor(abs / DAY)
  const hours = Math.floor((abs % DAY) / HOUR)
  const minutes = Math.floor((abs % HOUR) / MINUTE)
  const seconds = Math.floor((abs % MINUTE) / SECOND)

  let urgency: CountdownUrgency = "normal"
  if (expired) urgency = "expired"
  else if (remainingMs < DAY) urgency = "urgent"
  else if (remainingMs < 3 * DAY) urgency = "soon"

  return { remainingMs, expired, days, hours, minutes, seconds, urgency }
}

/**
 * Live-updating countdown to an ISO instant. Recomputes every second while the
 * target is under an hour away (or already past), and every minute otherwise,
 * so distant expiries don't churn. Returns `null` when `target` is nullish.
 */
export function useCountdown(target: string | null | undefined): Countdown | null {
  const targetMs = target ? new Date(target).getTime() : NaN
  const valid = Number.isFinite(targetMs)
  const [now, setNow] = useState(() => Date.now())

  // Tick every second when the target is within an hour (or already past), so the
  // seconds visibly move; otherwise every minute to avoid needless re-renders.
  const fast = valid && targetMs - now <= HOUR

  useEffect(() => {
    if (!valid) return
    const id = window.setInterval(() => setNow(Date.now()), fast ? SECOND : MINUTE)
    return () => window.clearInterval(id)
  }, [targetMs, valid, fast])

  if (!valid) return null
  return computeCountdown(targetMs, now)
}
