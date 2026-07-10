import { Skeleton } from "@/components/ui/skeleton"

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
