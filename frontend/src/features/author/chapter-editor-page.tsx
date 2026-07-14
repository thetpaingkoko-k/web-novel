import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useChapter, useCreateChapter, useSubmitChapterForPublish, useUpdateChapter } from "@/features/chapters/api"
import { buildChapterSchema, type ChapterFormSchema } from "./schemas"

export function ChapterEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { bookId: bookIdParam, chapterId: chapterIdParam } = useParams<{
    bookId?: string
    chapterId?: string
  }>()
  const isEditMode = Boolean(chapterIdParam)
  const chapterId = Number(chapterIdParam)
  const bookId = Number(bookIdParam)

  const { data: chapter, isLoading, isError, refetch } = useChapter(chapterId)
  const createChapter = useCreateChapter(isEditMode ? (chapter?.bookId ?? Number.NaN) : bookId)
  const updateChapter = useUpdateChapter(chapterId)
  const submitForPublish = useSubmitChapterForPublish()
  const schema = useMemo(() => buildChapterSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChapterFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { chapterNumber: 1, title: "", content: "", scheduledFor: "" },
  })

  useEffect(() => {
    if (chapter) {
      reset({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        // The backend doesn't echo a scheduled time back; the field only feeds
        // the next publish request.
        scheduledFor: "",
      })
    }
  }, [chapter, reset])

  if (isEditMode && isError) {
    return <QueryError message={t("chapters.notFound")} onRetry={() => refetch()} />
  }

  if (isEditMode && (isLoading || !chapter)) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const isProfessional = user?.role === "professional_author"
  const isPending = createChapter.isPending || updateChapter.isPending || submitForPublish.isPending

  function saveOnly(values: ChapterFormSchema) {
    const mutation = isEditMode ? updateChapter : createChapter
    mutation.mutate(values, {
      onSuccess: (saved) => {
        toast.success(t("author.chapterSaved"))
        if (!isEditMode) navigate(`/author/chapters/${saved.chapterId}/edit`, { replace: true })
      },
      onError: () => toast.error(t("common.genericError")),
    })
  }

  function saveAndSubmit(values: ChapterFormSchema) {
    const mutation = isEditMode ? updateChapter : createChapter
    mutation.mutate(values, {
      onSuccess: (saved) => {
        // datetime-local gives "YYYY-MM-DDTHH:mm"; the backend expects an
        // ISO-8601 offset datetime.
        const scheduledFor = values.scheduledFor
          ? new Date(values.scheduledFor).toISOString()
          : undefined
        // Publish the chapter we just saved by id — on create the URL param
        // has no id yet, so we can't rely on the mutation being bound to it.
        submitForPublish.mutate(
          { chapterId: saved.chapterId, scheduledFor },
          {
            onSuccess: (published) => {
              toast.success(
                published.status === "scheduled"
                  ? t("author.chapterScheduled")
                  : published.status === "published"
                    ? t("author.chapterPublished")
                    : t("author.chapterSubmittedForReview")
              )
              navigate(`/author/books/${published.bookId}/edit`)
            },
            onError: () => toast.error(t("common.genericError")),
          }
        )
      },
      onError: () => toast.error(t("common.genericError")),
    })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? t("author.editChapter") : t("author.addChapter")}</CardTitle>
        </CardHeader>
        <CardContent>
          {chapter?.status === "rejected" && chapter.rejectionReason && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t("author.rejectionReason", { reason: chapter.rejectionReason })}
            </div>
          )}
          <form noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.chapterNumber} className="max-w-32">
                <FieldLabel htmlFor="chapter-number">{t("author.chapterNumber")}</FieldLabel>
                <Input
                  id="chapter-number"
                  type="number"
                  min={1}
                  aria-invalid={!!errors.chapterNumber}
                  {...register("chapterNumber", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.chapterNumber]} />
              </Field>

              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="chapter-title">{t("author.chapterTitle")}</FieldLabel>
                <Input id="chapter-title" aria-invalid={!!errors.title} {...register("title")} />
                <FieldError errors={[errors.title]} />
              </Field>

              <Field data-invalid={!!errors.content}>
                <FieldLabel htmlFor="chapter-content">{t("author.chapterContent")}</FieldLabel>
                <Textarea
                  id="chapter-content"
                  rows={16}
                  aria-invalid={!!errors.content}
                  {...register("content")}
                />
                <FieldError errors={[errors.content]} />
              </Field>

              {isProfessional && (
                <Field>
                  <FieldLabel htmlFor="chapter-schedule">{t("author.schedulePublish")}</FieldLabel>
                  <Input
                    id="chapter-schedule"
                    type="datetime-local"
                    className="max-w-60"
                    {...register("scheduledFor")}
                  />
                  <FieldDescription>{t("author.scheduleHint")}</FieldDescription>
                </Field>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleSubmit(saveOnly)}
                >
                  {t("author.saveDraft")}
                </Button>
                <Button type="button" disabled={isPending} onClick={handleSubmit(saveAndSubmit)}>
                  {isProfessional ? t("author.publish") : t("author.submitForReview")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
