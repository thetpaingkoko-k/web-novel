import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, CalendarClock, FileText, Maximize2, Minimize2, PenLine, Send, Timer, Type } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
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
  const [focusMode, setFocusMode] = useState(false)

  const { data: chapter, isLoading, isError, refetch } = useChapter(chapterId)
  const createChapter = useCreateChapter(isEditMode ? (chapter?.bookId ?? Number.NaN) : bookId)
  const updateChapter = useUpdateChapter(chapterId)
  const submitForPublish = useSubmitChapterForPublish()
  const schema = useMemo(() => buildChapterSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChapterFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "", scheduledFor: "" },
  })

  useEffect(() => {
    if (chapter) {
      reset({
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

  // ⌘/Ctrl-S saves the draft without leaving the editor. `saveOnly` is a hoisted
  // function declaration, so referencing it here is safe.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        handleSubmit(saveOnly)()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 transition-[max-width] duration-200",
        focusMode ? "max-w-5xl" : "max-w-3xl"
      )}
    >
      {!focusMode && (
        <StudioHero
          eyebrow={t("author.studioEyebrow")}
          icon={PenLine}
          title={isEditMode ? t("author.editChapter") : t("author.addChapter")}
          subtitle={t("author.chapterEditorSubtitle")}
        />
      )}

      {!focusMode && chapter?.status === "rejected" && chapter.rejectionReason && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("author.rejectionReason", { reason: chapter.rejectionReason })}</span>
        </div>
      )}

      <form noValidate className="flex flex-col gap-6">
        {!focusMode && (
          <Card>
            <CardContent className="pt-2">
              <FieldGroup>
                <Field data-invalid={!!errors.title}>
                  <FieldLabel htmlFor="chapter-title">{t("author.chapterTitle")}</FieldLabel>
                  <Input id="chapter-title" aria-invalid={!!errors.title} {...register("title")} />
                  {/* The chapter number is assigned automatically (next in the book). */}
                  <FieldDescription>
                    {isEditMode && chapter
                      ? t("chapters.chapterLabel", { number: chapter.chapterNumber })
                      : t("author.chapterNumberAuto")}
                  </FieldDescription>
                  <FieldError errors={[errors.title]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        )}

        {/* Roomy, distraction-reduced writing surface with a live stat strip. */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel htmlFor="chapter-content" className="flex items-center gap-1.5">
                <PenLine className="h-4 w-4 text-primary" aria-hidden="true" />
                {t("author.chapterContent")}
              </FieldLabel>
              <div className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    <Type className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("author.wordCount", { count: wordCount })}
                  </span>
                  <span className="hidden items-center gap-1 rounded-full bg-muted px-2.5 py-1 sm:flex">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("author.charCount", { count: charCount })}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                    <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("author.readingTimeMin", { count: readingMinutes })}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  aria-pressed={focusMode}
                  onClick={() => setFocusMode((v) => !v)}
                >
                  {focusMode ? (
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {focusMode ? t("author.exitFocusMode") : t("author.focusMode")}
                </Button>
              </div>
            </div>
            <Textarea
              id="chapter-content"
              aria-invalid={!!errors.content}
              className={cn(
                "reading-prose resize-y border-border/70 bg-background leading-relaxed focus-visible:ring-primary/40",
                focusMode ? "min-h-[78vh]" : "min-h-[60vh]"
              )}
              placeholder={t("author.chapterContentPlaceholder")}
              {...register("content")}
            />
            <FieldError errors={[errors.content]} />
          </CardContent>
        </Card>

        {isProfessional && !focusMode && (
          <Card>
            <CardContent className="pt-2">
              <FieldGroup>
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
              </FieldGroup>
            </CardContent>
          </Card>
        )}

        {/* Sticky action bar — stays reachable in long chapters. */}
        <div className="sticky bottom-4 z-20">
          <div className="glass flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 p-3 shadow-lg">
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
            <span className="ml-auto hidden pr-1 text-xs text-muted-foreground sm:inline">
              {t("author.saveShortcutHint")}
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}
