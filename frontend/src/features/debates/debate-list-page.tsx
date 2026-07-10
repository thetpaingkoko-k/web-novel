import { MessagesSquare } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { useDebateThreads } from "./api"
import { CreateThreadDialog } from "./components/create-thread-dialog"

export function DebateListPage() {
  const { t } = useTranslation()
  const { bookId: bookIdParam } = useParams<{ bookId: string }>()
  const bookId = Number(bookIdParam)
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError, refetch } = useDebateThreads(bookId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("debates.title")}</h1>
          <Link
            to={`/books/${bookId}`}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            {t("chapters.backToBook")}
          </Link>
        </div>
        {isAuthenticated && <CreateThreadDialog bookId={bookId} />}
      </div>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState icon={MessagesSquare} message={t("debates.empty")} />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <ol className="flex flex-col divide-y rounded-lg border">
          {data.map((thread) => (
            <li key={thread.threadId}>
              <Link
                to={`/debates/${thread.threadId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{thread.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("debates.startedBy", { author: thread.creatorUsername })} ·{" "}
                    {t("debates.postCount", { count: thread.postCount })}
                  </span>
                </div>
                {thread.status !== "open" && (
                  <Badge variant="secondary">{t("debates.status." + thread.status)}</Badge>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
