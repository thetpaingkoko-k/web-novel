import { Inbox, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"

interface QueueShellProps<T> {
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  data: T[] | undefined
  emptyMessage: string
  emptyIcon?: LucideIcon
  children: (items: T[]) => ReactNode
}

export function QueueShell<T>({
  isLoading,
  isError,
  onRetry,
  data,
  emptyMessage,
  emptyIcon = Inbox,
  children,
}: QueueShellProps<T>) {
  if (isError) return <QueryError onRetry={onRetry} />

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} />
  }

  return <>{children(data)}</>
}
