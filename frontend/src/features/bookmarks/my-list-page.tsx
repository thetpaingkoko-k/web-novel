import { BookMarked } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { useMyBookmarks } from "./api"

export function MyListPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useMyBookmarks(true)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("library.title")}</h1>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState
          icon={BookMarked}
          message={t("library.empty")}
          action={
            <Button asChild size="sm">
              <Link to="/books">{t("nav.browse")}</Link>
            </Button>
          }
        />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((book) => (
            <BookCard key={book.bookId} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
