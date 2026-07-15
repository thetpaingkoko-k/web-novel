import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { BookOpen } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { usePostComment } from "@/features/chapters/api"
import { buildCommentSchema, type CommentFormSchema } from "@/features/chapters/schemas"

interface CommentComposerProps {
  chapterId: number
  parentCommentId?: number
  onPosted?: () => void
  autoFocus?: boolean
}

export function CommentComposer({ chapterId, parentCommentId, onPosted, autoFocus }: CommentComposerProps) {
  const { t } = useTranslation()
  const postComment = usePostComment(chapterId)
  const schema = useMemo(() => buildCommentSchema(t), [t])
  // The backend blocks commenting until the reader has recorded a view of the
  // chapter (403 comment.must_read_first); we surface a friendly inline hint.
  const [mustReadFirst, setMustReadFirst] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { content: "" },
  })

  const onSubmit = handleSubmit((values) => {
    setMustReadFirst(false)
    postComment.mutate(
      { content: values.content, parentCommentId, spoiler: false },
      {
        onSuccess: () => {
          reset()
          onPosted?.()
        },
        onError: (error) => {
          const code = isAxiosError(error)
            ? (error.response?.data as { code?: string } | undefined)?.code
            : undefined
          if (code === "comment.must_read_first") {
            setMustReadFirst(true)
            toast.error(t("comments.mustReadFirst"))
            return
          }
          toast.error(t("common.genericError"))
        },
      }
    )
  })

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn(
        "flex flex-col gap-2",
        !parentCommentId &&
          "rounded-2xl border bg-card p-4 transition-shadow focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15"
      )}
    >
      <Field data-invalid={!!errors.content}>
        <Textarea
          rows={parentCommentId ? 2 : 3}
          autoFocus={autoFocus}
          placeholder={t(parentCommentId ? "comments.replyPlaceholder" : "comments.placeholder")}
          aria-invalid={!!errors.content}
          aria-label={t("comments.yourComment")}
          className="resize-none"
          {...register("content")}
        />
        <FieldError errors={[errors.content]} />
      </Field>
      {mustReadFirst && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
          {t("comments.mustReadFirst")}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={postComment.isPending}>
          {t("comments.post")}
        </Button>
      </div>
    </form>
  )
}
