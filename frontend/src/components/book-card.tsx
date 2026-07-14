import { BookOpen, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { resolveUploadUrl } from "@/api/uploads"
import { ProgressRing } from "@/components/progress-ring"
import { genreLabelKey } from "@/lib/genres"
import type { BookListItem } from "@/types/content"

export function BookCard({ book, to }: { book: BookListItem; to?: string }) {
  const { t } = useTranslation()
  const primaryGenre = book.genres[0]
  const hasProgress =
    book.readChaptersCount != null && book.readChaptersCount > 0 && book.chapterCount > 0

  return (
    <Link to={to ?? `/books/${book.bookId}`} className="group hover-lift flex flex-col">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-sm ring-0 transition-shadow group-hover:shadow-lg group-hover:shadow-primary/10">
        {book.coverImageUrl ? (
          <img
            src={resolveUploadUrl(book.coverImageUrl)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="bg-brand/10 flex h-full w-full items-center justify-center">
            <BookOpen className="h-8 w-8 text-primary/50" aria-hidden="true" />
          </div>
        )}
        {/* Bottom scrim keeps overlaid meta legible on bright covers. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {book.isPremium && (
          <span className="brand-gradient absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            <Sparkles className="size-3" />
            {t("books.premium")}
          </span>
        )}
        {hasProgress && (
          <div className="absolute top-2 left-2 rounded-full bg-background/85 p-0.5 backdrop-blur-sm">
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
      <div className="flex flex-1 flex-col gap-0.5 px-0.5 pt-2.5">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold transition-colors group-hover:text-primary">
          {book.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("books.byAuthor", { author: book.authorUsername })}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1 text-xs text-muted-foreground">
          {primaryGenre && (
            <span className="font-medium text-foreground/70">{t(genreLabelKey(primaryGenre))}</span>
          )}
          {primaryGenre && <span aria-hidden>·</span>}
          <span>{t("books.status." + book.status)}</span>
        </div>
      </div>
    </Link>
  )
}
