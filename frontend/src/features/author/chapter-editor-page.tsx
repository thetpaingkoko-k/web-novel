import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { AlertTriangle, CalendarClock, FileText, Headphones, Lock, Maximize2, Minimize2, PenLine, Send, Timer, Trash2, Type } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog"
import { AudioUploadField } from "@/components/audio-upload-field"
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
import { useBook } from "@/features/books/api"
import {
  useChapter,
  useCreateChapter,
  useDeleteChapter,
  useSetChapterAudio,
  useSubmitChapterForPublish,
  useUpdateChapter,
} from "@/features/chapters/api"
import { buildChapterSchema, type ChapterFormSchema } from "./schemas"

/** Average reading speed used to estimate a chapter's reading time (matches the reader). */
const WORDS_PER_MINUTE = 200
/** Soft cap: chapters longer than this (in reading minutes) get a "consider splitting" warning. */
const MAX_READING_MINUTES = 7
/** Word count equivalent to the reading-time cap. Warn-only — saving/publishing isn't blocked. */
const MAX_WORDS = MAX_READING_MINUTES * WORDS_PER_MINUTE

function countWords(text: string) {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/**
 * Convert an ISO-8601 instant into the local "YYYY-MM-DDTHH:mm" string a
 * `datetime-local` input expects, so a scheduled time round-trips into the
 * editor. Returns "" when there's no usable value.
 */
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
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
  // The owning book — in create mode it's the URL param; in edit mode it comes
  // from the loaded chapter. We read its chapter list to detect an existing
  // draft so we can steer the author away from orphaning it (see below).
  const effectiveBookId = isEditMode ? (chapter?.bookId ?? Number.NaN) : bookId
  const { data: book } = useBook(effectiveBookId)
  const createChapter = useCreateChapter(isEditMode ? (chapter?.bookId ?? Number.NaN) : bookId)
  const updateChapter = useUpdateChapter(chapterId)
  const deleteChapter = useDeleteChapter(chapter?.bookId ?? Number.NaN)
  const setChapterAudio = useSetChapterAudio(chapterId)
  const submitForPublish = useSubmitChapterForPublish()
  const schema = useMemo(() => buildChapterSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChapterFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "", scheduledFor: "", audioUrl: "" },
  })

  useEffect(() => {
    if (chapter) {
      reset({
        title: chapter.title,
        content: chapter.content,
        // A scheduled chapter carries its target instant in `publishedAt`; echo
        // it back into the datetime-local input so the author can see/adjust it.
        scheduledFor: chapter.status === "scheduled" ? toDatetimeLocal(chapter.publishedAt) : "",
        audioUrl: chapter.audioUrl ?? "",
      })
    }
  }, [chapter, reset])

  const content = watch("content") ?? ""
  const audioUrl = watch("audioUrl") ?? ""
  const wordCount = useMemo(() => countWords(content), [content])
  const charCount = content.length
  const readingMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))
  // Warn-only: the chapter is longer than the 7-minute reading target. Never blocks save/publish.
  const overReadingLimit = wordCount > MAX_WORDS

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
  const isAdmin = user?.role === "admin"
  // PUT /chapters/{id} is admin-only: a non-admin author can create a chapter
  // and publish/delete a draft, but can't edit an existing chapter's content —
  // they revise by deleting the draft and adding a new one.
  const canEditContent = !isEditMode || isAdmin
  const isDraft = chapter?.status === "draft"
  // Authors may delete their own draft OR rejected chapters (others are admin-only).
  const canDeleteChapter = chapter?.status === "draft" || chapter?.status === "rejected"
  const isPending =
    createChapter.isPending ||
    updateChapter.isPending ||
    submitForPublish.isPending ||
    deleteChapter.isPending

  // A book may hold only one draft at a time — publishing a new chapter while an
  // earlier draft is still unpublished would orphan it (backend rejects this
  // with `chapter.existing_draft`). Detect any OTHER draft in the book so we can
  // proactively block the Publish action and point the author to that draft.
  const existingDraft = book?.chapters.find(
    (c) => c.status === "draft" && c.chapterId !== (isEditMode ? chapterId : -1)
  )
  const publishBlockedByDraft = Boolean(existingDraft)

  function saveOnly(values: ChapterFormSchema) {
    if (!canEditContent) return
    const mutation = isEditMode ? updateChapter : createChapter
    mutation.mutate(values, {
      onSuccess: (saved) => {
        toast.success(t("author.chapterSaved"))
        if (!isEditMode) navigate(`/author/chapters/${saved.chapterId}/edit`, { replace: true })
      },
      onError: () => toast.error(t("common.genericError")),
    })
  }

  function publishChapter(id: number, scheduledFor?: string) {
    submitForPublish.mutate(
      { chapterId: id, scheduledFor },
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
        onError: (error) => {
          const code = isAxiosError(error)
            ? (error.response?.data as { code?: string } | undefined)?.code
            : undefined
          toast.error(
            code === "existing_draft"
              ? t("author.existingDraft")
              : t("common.genericError")
          )
        },
      }
    )
  }

  function saveAndSubmit(values: ChapterFormSchema) {
    // datetime-local gives "YYYY-MM-DDTHH:mm"; the backend expects an ISO-8601
    // offset datetime.
    const scheduledFor = values.scheduledFor
      ? new Date(values.scheduledFor).toISOString()
      : undefined

    // Non-admin authors editing an existing chapter can't PUT content, so we
    // publish the chapter directly without a content update.
    if (isEditMode && !canEditContent) {
      publishChapter(chapterId, scheduledFor)
      return
    }

    const mutation = isEditMode ? updateChapter : createChapter
    mutation.mutate(values, {
      // Publish the chapter we just saved by id — on create the URL param has
      // no id yet, so we can't rely on the mutation being bound to it.
      onSuccess: (saved) => publishChapter(saved.chapterId, scheduledFor),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  function handleAudioChange(url: string) {
    setValue("audioUrl", url, { shouldDirty: true })
    // Once the chapter exists it has its own audio endpoint, so persist right
    // away — this works even after publish, unlike content edits. In create mode
    // there's no id yet, so the value simply rides along with the create call.
    if (isEditMode && chapter) {
      setChapterAudio.mutate(url || null, {
        onSuccess: () => toast.success(url ? t("author.audioSaved") : t("author.audioRemoved")),
        onError: () => toast.error(t("common.genericError")),
      })
    }
  }

  function onDeleteDraft() {
    if (!chapter) return
    deleteChapter.mutate(chapter.chapterId, {
      onSuccess: () => {
        toast.success(t("author.chapterDeleted"))
        navigate(`/author/books/${chapter.bookId}/edit`)
      },
      onError: (error) => {
        const code = isAxiosError(error)
          ? (error.response?.data as { code?: string } | undefined)?.code
          : undefined
        toast.error(
          code === "chapter.delete_draft_only"
            ? t("author.deleteDraftOnly")
            : t("common.genericError")
        )
      },
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

      {!focusMode && overReadingLimit && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{t("author.readingLimitWarning", { max: MAX_READING_MINUTES })}</span>
        </div>
      )}

      {!focusMode && publishBlockedByDraft && existingDraft && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{t("author.existingDraft")}</span>
          <Button asChild variant="outline" size="xs" className="ml-auto">
            <Link to={`/author/chapters/${existingDraft.chapterId}/edit`}>
              {t("author.openExistingDraft")}
            </Link>
          </Button>
        </div>
      )}

      {!focusMode && !canEditContent && (
        <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/50 p-3 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("author.contentLockedNote")}</span>
        </div>
      )}

      <form noValidate className="flex flex-col gap-6">
        {!focusMode && (
          <Card>
            <CardContent className="pt-2">
              <FieldGroup>
                <Field data-invalid={!!errors.title}>
                  <FieldLabel htmlFor="chapter-title">{t("author.chapterTitle")}</FieldLabel>
                  <Input
                    id="chapter-title"
                    aria-invalid={!!errors.title}
                    readOnly={!canEditContent}
                    className={cn(!canEditContent && "cursor-not-allowed opacity-70")}
                    {...register("title")}
                  />
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
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1",
                      overReadingLimit
                        ? "bg-warning/15 text-warning"
                        : "bg-primary/10 text-primary"
                    )}
                    title={overReadingLimit ? t("author.readingLimitWarning", { max: MAX_READING_MINUTES }) : undefined}
                  >
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
              readOnly={!canEditContent}
              className={cn(
                "reading-prose resize-y border-border/70 bg-background leading-relaxed focus-visible:ring-primary/40",
                focusMode ? "min-h-[78vh]" : "min-h-[60vh]",
                !canEditContent && "cursor-not-allowed opacity-80"
              )}
              placeholder={t("author.chapterContentPlaceholder")}
              {...register("content")}
            />
            <FieldError errors={[errors.content]} />
          </CardContent>
        </Card>

        {/* Optional narration audio (audiobook). Available in both create and edit
            mode — including after publish — since audio is set through its own
            endpoint, independent of the admin-only content lock. */}
        {!focusMode && (
          <Card>
            <CardContent className="pt-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="chapter-audio" className="flex items-center gap-1.5">
                    <Headphones className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t("author.chapterAudio")}
                  </FieldLabel>
                  <FieldDescription>{t("author.chapterAudioHint")}</FieldDescription>
                  <AudioUploadField
                    id="chapter-audio"
                    value={audioUrl}
                    onChange={handleAudioChange}
                    disabled={isPending}
                    saving={setChapterAudio.isPending}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        )}

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
            {canEditContent ? (
              <>
                <Button
                  type="button"
                  disabled={isPending || publishBlockedByDraft}
                  onClick={handleSubmit(saveAndSubmit)}
                  className="glow-brand-hover"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {isProfessional || isAdmin ? t("author.publish") : t("author.submitForReview")}
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
              </>
            ) : (
              <>
                {isDraft && (
                  <Button
                    type="button"
                    disabled={isPending || publishBlockedByDraft}
                    onClick={handleSubmit(saveAndSubmit)}
                    className="glow-brand-hover"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {isProfessional ? t("author.publish") : t("author.submitForReview")}
                  </Button>
                )}
                {canDeleteChapter && (
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="outline" disabled={isPending}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t("author.deleteChapter")}
                      </Button>
                    }
                    title={t("author.deleteChapterConfirmTitle")}
                    description={t("author.deleteChapterConfirmBody")}
                    confirmLabel={t("author.deleteChapter")}
                    icon={Trash2}
                    onConfirm={onDeleteDraft}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  className="ml-auto"
                  onClick={() => {
                    if (chapter) navigate(`/author/books/${chapter.bookId}/edit`)
                    else navigate(-1)
                  }}
                >
                  {t("common.back")}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
