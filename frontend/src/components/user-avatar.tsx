import { useState } from "react"
import { resolveUploadUrl } from "@/api/uploads"
import { cn } from "@/lib/utils"

/**
 * A person's avatar: their uploaded profile picture when available, otherwise a
 * tinted initials chip. Decorative by default — the person's name is rendered as
 * real text next to it everywhere this is used — so it's hidden from screen
 * readers. Size is controlled by `className` (defaults to `size-9`).
 */
export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string | null
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const initials = name.trim().slice(0, 2).toUpperCase() || "?"
  const showImage = Boolean(src) && !failed

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary select-none",
        className,
      )}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={resolveUploadUrl(src!)}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  )
}
