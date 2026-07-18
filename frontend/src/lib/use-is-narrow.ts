import { useEffect, useState } from "react"

/** Below Tailwind's `md` breakpoint (768px). */
const QUERY = "(max-width: 767px)"

/**
 * True on narrow (mobile) viewports. Used to render a component's mobile and
 * desktop layouts as *alternatives* rather than both-in-DOM CSS toggles — so
 * screen readers and tests see one copy of the content, not two.
 *
 * Falls back to `false` (desktop) when `matchMedia` is unavailable (e.g. jsdom).
 */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(QUERY).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mq = window.matchMedia(QUERY)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return narrow
}
