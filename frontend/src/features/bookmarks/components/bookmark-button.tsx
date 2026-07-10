import { Bookmark } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-context"
import { useMyBookmarks, useToggleBookmark } from "../api"

export function BookmarkButton({ bookId }: { bookId: number }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isReader = user?.role === "reader"
  const { data: bookmarks } = useMyBookmarks(isReader)
  const toggle = useToggleBookmark(bookId)

  if (!isReader) return null

  const saved = bookmarks?.some((b) => b.bookId === bookId) ?? false

  return (
    <Button
      variant="outline"
      className="w-fit"
      aria-pressed={saved}
      disabled={toggle.isPending}
      onClick={() =>
        toggle.mutate(saved, {
          onSuccess: () => toast.success(t(saved ? "library.removed" : "library.added")),
          onError: () => toast.error(t("common.genericError")),
        })
      }
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current")} aria-hidden="true" />
      {t(saved ? "library.saved" : "library.save")}
    </Button>
  )
}
