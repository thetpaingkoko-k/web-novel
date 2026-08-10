import { Inbox, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminPageHeader } from "./admin-page-header"

interface QueueShellProps<T> {
  /** Page title shown in the header; omit to render the states with no header. */
  title?: string
  description?: string
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  data: T[] | undefined
  emptyMessage: string
  emptyIcon?: LucideIcon
  /** Optional summary/stat strip rendered above the list once data is present. */
  summary?: (items: T[]) => ReactNode
  children: (items: T[]) => ReactNode
}

/**
 * Reusable page-frame for admin queues: a consistent header plus the three
 * required states (loading skeletons, error with retry, designed empty state)
 * wrapping the queue content. The header icon doubles as the empty-state icon.
 */
export function QueueShell<T>({
  title,
  description,
  isLoading,
  isError,
  onRetry,
  data,
  emptyMessage,
  emptyIcon = Inbox,
  summary,
  children,
}: QueueShellProps<T>) {
  function body() {
    if (isError) return <QueryError onRetry={onRetry} />

    if (isLoading) {
      return (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )
    }

    if (!data || data.length === 0) {
      return <EmptyState icon={emptyIcon} message={emptyMessage} />
    }

    return (
      <>
        {summary?.(data)}
        {children(data)}
      </>
    )
  }

  if (!title && !description) return body()

  return (
    <div className="flex flex-col gap-6">
      {title && <AdminPageHeader title={title} description={description} icon={emptyIcon} />}
      {body()}
    </div>
  )
}
