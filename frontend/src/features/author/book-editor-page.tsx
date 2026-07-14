import { zodResolver } from "@hookform/resolvers/zod"
import { BookText, CheckCircle2, Eye, Heart, Image as ImageIcon, ListPlus, Rocket, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { ImageUploadField } from "@/components/image-upload-field"
import { QueryError } from "@/components/query-error"
import { StudioHero } from "@/components/studio-hero"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useBook, useCreateBook, useUpdateBook } from "@/features/books/api"
import { buildBookSchema, type BookFormSchema } from "./schemas"

const STATUSES = ["draft", "ongoing", "completed", "hiatus"] as const

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Icon className="size-4.5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

export function BookEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { bookId: bookIdParam } = useParams<{ bookId: string }>()
  const isEditMode = Boolean(bookIdParam)
  const bookId = Number(bookIdParam)

  const { data: book, isLoading, isError, refetch } = useBook(bookId)
  const createBook = useCreateBook()
  const updateBook = useUpdateBook(bookId)
  const schema = useMemo(() => buildBookSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      synopsis: "",
      genre: "",
      coverImageUrl: "",
      status: "draft",
      isPremium: false,
    },
  })

  useEffect(() => {
    if (book) {
      reset({
        title: book.title,
        synopsis: book.synopsis ?? "",
        genre: book.genre ?? "",
        coverImageUrl: book.coverImageUrl ?? "",
        status: book.status,
        isPremium: book.isPremium,
      })
    }
  }, [book, reset])

  const canPublishPremium = user?.isMonetizationEnabled ?? false
  const isPremium = watch("isPremium")

  const onSubmit = handleSubmit((values) => {
    const mutation = isEditMode ? updateBook : createBook
    mutation.mutate(values, {
      onSuccess: (saved) => {
        toast.success(t("author.bookSaved"))
        if (!isEditMode) navigate(`/author/books/${saved.bookId}/edit`, { replace: true })
      },
      onError: () => toast.error(t("common.genericError")),
    })
  })

  if (isEditMode && isError) {
    return <QueryError message={t("books.notFound")} onRetry={() => refetch()} />
  }

  if (isEditMode && (isLoading || !book)) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  const isPending = createBook.isPending || updateBook.isPending

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <StudioHero
        eyebrow={t("author.studioEyebrow")}
        icon={BookText}
        title={isEditMode ? t("author.editBook") : t("author.createBook")}
        subtitle={t("author.bookEditorSubtitle")}
      />

      <Card>
        <CardContent className="pt-2">
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <SectionHeading
                icon={BookText}
                title={t("author.detailsSection")}
                description={t("author.detailsSectionHint")}
              />

              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="book-title">{t("author.bookTitle")}</FieldLabel>
                <Input id="book-title" aria-invalid={!!errors.title} {...register("title")} />
                <FieldError errors={[errors.title]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="book-genre">{t("author.bookGenre")}</FieldLabel>
                <Input id="book-genre" placeholder={t("author.genrePlaceholder")} {...register("genre")} />
              </Field>

              <Field>
                <FieldLabel htmlFor="book-synopsis">{t("author.bookSynopsis")}</FieldLabel>
                <Textarea id="book-synopsis" rows={5} {...register("synopsis")} />
                <FieldDescription>{t("author.synopsisHint")}</FieldDescription>
              </Field>

              <Separator />

              <SectionHeading
                icon={ImageIcon}
                title={t("author.coverSection")}
                description={t("author.coverHint")}
              />

              <Field>
                <FieldLabel htmlFor="book-cover">{t("author.bookCover")}</FieldLabel>
                <ImageUploadField
                  id="book-cover"
                  value={watch("coverImageUrl")}
                  onChange={(url) => setValue("coverImageUrl", url, { shouldDirty: true })}
                />
              </Field>

              <Separator />

              <SectionHeading icon={Rocket} title={t("author.publishingSection")} />

              <Field>
                <FieldLabel htmlFor="book-status">{t("author.bookStatus")}</FieldLabel>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as BookFormSchema["status"])}
                >
                  <SelectTrigger id="book-status" className="max-w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t("books.status." + s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                orientation="horizontal"
                className="rounded-xl border border-primary/15 bg-primary/5 p-4"
              >
                <FieldLabel htmlFor="book-premium">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t("author.bookIsPremium")}
                  </span>
                  <FieldDescription>
                    {canPublishPremium ? t("author.premiumHint") : t("author.premiumDisabledHint")}
                  </FieldDescription>
                </FieldLabel>
                <Switch
                  id="book-premium"
                  checked={isPremium}
                  disabled={!canPublishPremium}
                  onCheckedChange={(checked) => setValue("isPremium", checked)}
                />
              </Field>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending} className="glow-brand-hover">
                  {t("common.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => navigate(-1)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {isEditMode && book && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t("books.chapters")}</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/author/books/${book.bookId}/chapters/new`}>
                <ListPlus className="h-4 w-4" />
                {t("author.addChapter")}
              </Link>
            </Button>
          </div>
          {book.chapters.length === 0 ? (
            <Card className="border-dashed">
              <CardContent>
                <EmptyState
                  icon={ListPlus}
                  message={t("books.noChaptersYet")}
                  action={
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/author/books/${book.bookId}/chapters/new`}>
                        {t("author.addChapter")}
                      </Link>
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <ol className="flex flex-col divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
              {book.chapters.map((chapter) => (
                <li key={chapter.chapterId}>
                  <Link
                    to={`/author/chapters/${chapter.chapterId}/edit`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
                        {chapter.chapterNumber}
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate font-medium">{chapter.title}</span>
                        {chapter.status === "published" && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("author.viewsCount", { count: chapter.uniqueViewCount })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("author.likesCount", { count: chapter.likeCount })}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("author.completionsCount", { count: chapter.completionCount })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={chapter.status === "rejected" ? "destructive" : "secondary"}>
                      {t("author.chapterStatus." + chapter.status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
