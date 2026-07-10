import { cn } from "@/lib/utils"

interface ProgressRingProps {
  /** Completion fraction, 0–1. */
  value: number
  /** Outer diameter in px. */
  size?: number
  strokeWidth?: number
  /** Accessible label; defaults to the percentage. */
  label?: string
  /** Show the "%" text in the middle (hidden on very small rings). */
  showPercent?: boolean
  className?: string
}

export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  label,
  showPercent = true,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const percent = Math.round(clamped * 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped)

  return (
    <div
      role="img"
      aria-label={label ?? `${percent}%`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {showPercent && (
        <span className="absolute text-[0.6rem] font-semibold tabular-nums">{percent}%</span>
      )}
    </div>
  )
}
