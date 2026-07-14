import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
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
    postComment.mutate(
      { content: values.content, parentCommentId, spoiler: false },
      {
        onSuccess: () => {
          reset()
          onPosted?.()
        },
        onError: () => toast.error(t("common.genericError")),
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
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={postComment.isPending}>
          {t("comments.post")}
        </Button>
      </div>
    </form>
  )
}
