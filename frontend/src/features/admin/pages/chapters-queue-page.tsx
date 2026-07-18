import { BookText, Check, Eye, FileCheck, Ban } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useChapter } from "@/features/chapters/api"
import type { PendingChapterReview } from "@/types/admin"
import { useApproveChapter, usePendingChapters, useRejectChapter } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import {
  DataTable,
  type DataColumn,
  type PrimaryRowAction,
  type RowAction,
} from "../components/data-table"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

/** Lazily fetches the full chapter body (admins may read non-published chapters). */
function ReviewContentDialog({
  chapter,
  onOpenChange,
}: {
  chapter: PendingChapterReview | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const open = chapter !== null
  const { data, isLoading, isError } = useChapter(open ? chapter.chapterId : Number.NaN)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {chapter &&
              `${t("chapters.chapterLabel", { number: chapter.chapterNumber })}: ${chapter.title}`}
          </DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        )}
        {isError && <p className="text-sm text-destructive">{t("admin.reviewContentError")}</p>}
        {data && <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.content}</p>}
      </DialogContent>
    </Dialog>
  )
}

export function ChaptersQueuePage() {
  const { t } = useTranslation()
  const [review, setReview] = useState<PendingChapterReview | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingChapterReview | null>(null)
  const { data, isLoading, isError, refetch } = usePendingChapters()
  const approve = useApproveChapter()
  const reject = useRejectChapter()

  function onApprove(chapterId: number) {
    approve.mutate(chapterId, {
      onSuccess: () => toast.success(t("admin.chapterApproved")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  const columns: DataColumn<PendingChapterReview>[] = [
    {
      key: "title",
      header: t("admin.table.chapter"),
      sortValue: (c) => c.chapterNumber,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookText className="size-4" aria-hidden />
          </span>
          <span className="line-clamp-2 font-medium">
            {t("chapters.chapterLabel", { number: c.chapterNumber })}: {c.title}
          </span>
        </div>
      ),
    },
    {
      key: "book",
      header: t("admin.table.book"),
      sortValue: (c) => c.bookTitle.toLowerCase(),
      cell: (c) => <span className="text-sm text-muted-foreground">{c.bookTitle}</span>,
    },
    {
      key: "author",
      header: t("admin.table.author"),
      sortValue: (c) => c.authorUsername.toLowerCase(),
      cell: (c) => <span className="text-sm">{c.authorUsername}</span>,
    },
  ]

  function rowPrimaryAction(c: PendingChapterReview): PrimaryRowAction {
    return {
      label: t("admin.approve"),
      icon: Check,
      variant: "success",
      disabled: approve.isPending,
      onSelect: () => onApprove(c.chapterId),
    }
  }

  function rowActions(c: PendingChapterReview): RowAction[] {
    return [
      { key: "review", label: t("admin.reviewContent"), icon: Eye, onSelect: () => setReview(c) },
      {
        key: "reject",
        label: t("admin.reject"),
        icon: Ban,
        tone: "destructive",
        separatorBefore: true,
        onSelect: () => setRejectTarget(c),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.chapters")}
        description={t("admin.desc.chapters")}
        icon={FileCheck}
      />

      <DataTable
        data={data}
        getRowId={(c) => c.chapterId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={FileCheck}
        emptyMessage={t("admin.chaptersEmpty")}
        columns={columns}
        rowPrimaryAction={rowPrimaryAction}
        rowActions={rowActions}
      />

      <ReviewContentDialog chapter={review} onOpenChange={(open) => !open && setReview(null)} />

      {rejectTarget && (
        <RejectWithReasonDialog
          hideTrigger
          open
          onOpenChange={(open) => !open && setRejectTarget(null)}
          title={t("admin.rejectChapterTitle")}
          pending={reject.isPending}
          onReject={(reason) =>
            reject.mutate(
              { chapterId: rejectTarget.chapterId, reason },
              {
                onSuccess: () => toast.success(t("admin.chapterRejected")),
                onError: () => toast.error(t("common.genericError")),
              },
            )
          }
        />
      )}
    </div>
  )
}
