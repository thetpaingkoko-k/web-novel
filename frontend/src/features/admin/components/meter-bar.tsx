import { cn } from "@/lib/utils"
import type { AdminTone } from "./admin-primitives"

/**
 * A minimalist segmented magnitude meter: one stacked horizontal bar whose
 * segments sum to `total`, paired with a direct-labelled legend. Colour lives
 * only on the bar and the legend dot; every number stays in an ink token so
 * identity is never carried by colour alone.
 */

type MeterTone = Extract<AdminTone, "success" | "primary" | "info" | "warning"> | "neutral"

const FILL: Record<MeterTone, string> = {
  success: "bg-success",
  primary: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  neutral: "bg-foreground/25",
}

const DOT: Record<MeterTone, string> = {
  success: "bg-success",
  primary: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  neutral: "bg-foreground/30",
}

export interface MeterSegment {
  key: string
  label: string
  value: number
  tone: MeterTone
}

interface MeterBarProps {
  segments: MeterSegment[]
  /** Whole the segments are measured against; defaults to their sum. */
  total?: number
  /** Formats a raw amount for the legend (e.g. `12,000 MMK`). */
  format: (value: number) => string
}

export function MeterBar({ segments, total, format }: MeterBarProps) {
  const sum = total ?? segments.reduce((acc, s) => acc + s.value, 0)
  const pct = (v: number) => (sum > 0 ? (v / sum) * 100 : 0)

  return (
    <div className="space-y-3">
      {/* 2px surface gaps between fills; a muted track carries any empty remainder. */}
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              className={cn("h-full rounded-full", FILL[s.tone])}
              style={{ width: `${pct(s.value)}%` }}
            />
          ))}
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-full", DOT[s.tone])} aria-hidden />
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {format(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
