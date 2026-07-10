import { BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { ProgressRing } from "@/components/progress-ring"
import { Badge } from "@/components/ui/badge"
import type { BookListItem } from "@/types/content"

export function BookCard({ book, to }: { book: BookListItem; to?: string }) {
  const { t } = useTranslation()
  const hasProgress =
    book.readChaptersCount != null && book.readChaptersCount > 0 && book.chapterCount > 0

  return (
    <Link
      to={to ?? `/books/${book.bookId}`}
      className="group flex flex-col overflow-hidden rounded-lg border transition-colors hover:border-ring"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        {book.isPremium && (
          <Badge className="absolute top-2 right-2" variant="default">
            {t("books.premium")}
          </Badge>
        )}
        {hasProgress && (
          <div className="absolute top-2 left-2 rounded-full bg-background/80 p-0.5 backdrop-blur-sm">
            <ProgressRing
              value={book.readChaptersCount! / book.chapterCount}
              size={34}
              strokeWidth={3}
              label={t("books.progressText", {
                read: book.readChaptersCount,
                total: book.chapterCount,
              })}
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{book.title}</h3>
        <p className="text-xs text-muted-foreground">{t("books.byAuthor", { author: book.authorUsername })}</p>
        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          {book.genre && <span>{book.genre}</span>}
          <span>·</span>
          <span>{t("books.status." + book.status)}</span>
        </div>
      </div>
    </Link>
  )
}
