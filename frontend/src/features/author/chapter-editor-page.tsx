import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, CalendarClock, FileText, PenLine, Send, Timer, Type } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { QueryError } from "@/components/query-error"
import { StudioHero } from "@/components/studio-hero"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useChapter, useCreateChapter, useSubmitChapterForPublish, useUpdateChapter } from "@/features/chapters/api"
import { buildChapterSchema, type ChapterFormSchema } from "./schemas"

function countWords(text: string) {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

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
  const submitForPublish = useSubmitChapterForPublish(chapterId)
  const schema = useMemo(() => buildChapterSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
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

  const content = watch("content") ?? ""
  const wordCount = useMemo(() => countWords(content), [content])
  const charCount = content.length
  const readingMinutes = Math.max(1, Math.round(wordCount / 200))

  if (isEditMode && isError) {
    return <QueryError message={t("chapters.notFound")} onRetry={() => refetch()} />
  }

  if (isEditMode && (isLoading || !chapter)) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-96 w-full rounded-xl" />
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
        submitForPublish.mutate(scheduledFor, {
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
        })
        if (!isEditMode) navigate(`/author/chapters/${saved.chapterId}/edit`, { replace: true })
      },
      onError: () => toast.error(t("common.genericError")),
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <StudioHero
        eyebrow={t("author.studioEyebrow")}
        icon={PenLine}
        title={isEditMode ? t("author.editChapter") : t("author.addChapter")}
        subtitle={t("author.chapterEditorSubtitle")}
      />

      {chapter?.status === "rejected" && chapter.rejectionReason && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("author.rejectionReason", { reason: chapter.rejectionReason })}</span>
        </div>
      )}

      <form noValidate className="flex flex-col gap-6">
        <Card>
          <CardContent className="pt-2">
            <FieldGroup>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Field data-invalid={!!errors.chapterNumber} className="sm:w-32">
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

                <Field data-invalid={!!errors.title} className="flex-1">
                  <FieldLabel htmlFor="chapter-title">{t("author.chapterTitle")}</FieldLabel>
                  <Input id="chapter-title" aria-invalid={!!errors.title} {...register("title")} />
                  <FieldError errors={[errors.title]} />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Roomy, distraction-reduced writing surface with a live stat strip. */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel htmlFor="chapter-content" className="flex items-center gap-1.5">
                <PenLine className="h-4 w-4 text-primary" aria-hidden="true" />
                {t("author.chapterContent")}
              </FieldLabel>
              <div
                className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground"
                aria-live="polite"
              >
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <Type className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("author.wordCount", { count: wordCount })}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("author.charCount", { count: charCount })}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("author.readingTimeMin", { count: readingMinutes })}
                </span>
              </div>
            </div>
            <Textarea
              id="chapter-content"
              aria-invalid={!!errors.content}
              className="reading-prose min-h-[60vh] resize-y border-border/70 bg-background leading-relaxed focus-visible:ring-primary/40"
              placeholder={t("author.chapterContentPlaceholder")}
              {...register("content")}
            />
            <FieldError errors={[errors.content]} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-2">
            <FieldGroup>
              {isProfessional && (
                <>
                  <Field>
                    <FieldLabel htmlFor="chapter-schedule" className="flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                      {t("author.schedulePublish")}
                    </FieldLabel>
                    <Input
                      id="chapter-schedule"
                      type="datetime-local"
                      className="max-w-60"
                      {...register("scheduledFor")}
                    />
                    <FieldDescription>{t("author.scheduleHint")}</FieldDescription>
                  </Field>
                  <Separator />
                </>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handleSubmit(saveAndSubmit)}
                  className="glow-brand-hover"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {isProfessional ? t("author.publish") : t("author.submitForReview")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleSubmit(saveOnly)}
                >
                  {t("author.saveDraft")}
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
