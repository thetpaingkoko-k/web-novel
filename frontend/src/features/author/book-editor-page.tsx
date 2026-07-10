import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Eye, FileText, Heart, ListPlus } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useBook, useCreateBook, useUpdateBook } from "@/features/books/api"
import { buildBookSchema, type BookFormSchema } from "./schemas"

const STATUSES = ["draft", "ongoing", "completed", "hiatus"] as const

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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const isPending = createBook.isPending || updateBook.isPending

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? t("author.editBook") : t("author.createBook")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="book-title">{t("author.bookTitle")}</FieldLabel>
                <Input id="book-title" aria-invalid={!!errors.title} {...register("title")} />
                <FieldError errors={[errors.title]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="book-genre">{t("author.bookGenre")}</FieldLabel>
                <Input id="book-genre" {...register("genre")} />
              </Field>

              <Field>
                <FieldLabel htmlFor="book-cover">{t("author.bookCoverUrl")}</FieldLabel>
                <Input id="book-cover" type="url" {...register("coverImageUrl")} />
              </Field>

              <Field>
                <FieldLabel htmlFor="book-synopsis">{t("author.bookSynopsis")}</FieldLabel>
                <Textarea id="book-synopsis" rows={4} {...register("synopsis")} />
              </Field>

              <Field>
                <FieldLabel htmlFor="book-status">{t("author.bookStatus")}</FieldLabel>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as BookFormSchema["status"])}
                >
                  <SelectTrigger id="book-status">
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

              <Field orientation="horizontal">
                <FieldLabel htmlFor="book-premium">
                  {t("author.bookIsPremium")}
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

              <Button type="submit" className="w-fit" disabled={isPending}>
                {t("common.save")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {isEditMode && book && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">{t("books.chapters")}</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/author/books/${book.bookId}/chapters/new`}>
                <ListPlus className="h-4 w-4" />
                {t("author.addChapter")}
              </Link>
            </Button>
          </div>
          {book.chapters.length === 0 ? (
            <EmptyState icon={FileText} message={t("books.noChaptersYet")} />
          ) : (
            <ol className="flex flex-col divide-y rounded-lg border">
              {book.chapters.map((chapter) => (
                <li key={chapter.chapterId}>
                  <Link
                    to={`/author/chapters/${chapter.chapterId}/edit`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted"
                  >
                    <div className="flex flex-col gap-1">
                      <span>
                        {t("chapters.chapterLabel", { number: chapter.chapterNumber })} · {chapter.title}
                      </span>
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
