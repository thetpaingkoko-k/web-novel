import { BookPlus, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { useMyBooks } from "@/features/books/api"

export function AuthorDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useMyBooks(user?.userId ?? Number.NaN)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("author.dashboardTitle")}</h1>
        <Button asChild>
          <Link to="/author/books/new">
            <Plus className="h-4 w-4" />
            {t("author.createBook")}
          </Link>
        </Button>
      </div>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState
          icon={BookPlus}
          message={t("author.noBooksYet")}
          action={
            <Button asChild size="sm">
              <Link to="/author/books/new">{t("author.createBook")}</Link>
            </Button>
          }
        />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((book) => (
            <BookCard key={book.bookId} book={book} to={`/author/books/${book.bookId}/edit`} />
          ))}
        </div>
      )}
    </div>
  )
}
