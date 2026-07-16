import { cn } from "@/lib/utils"

/**
 * The NovelSpire brand wordmark — icon-free and flagship-minimal. The serif
 * name splits two-tone at the "Spire" so the brand's namesake reads in the
 * indigo accent, the whole thing carrying an editorial voice with no box or
 * pictorial mark. The name is a fixed brand asset, so it is intentionally not
 * localised here (the plain-text `app.name` string covers screen-reader/meta use).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-display font-semibold tracking-tight whitespace-nowrap", className)}
      aria-label="NovelSpire"
    >
      <span className="text-foreground">Novel</span>
      <span className="text-primary">Spire</span>
    </span>
  )
}
