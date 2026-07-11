import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <Field data-invalid={!!errors.content}>
        <Textarea
          rows={parentCommentId ? 2 : 3}
          autoFocus={autoFocus}
          placeholder={t(parentCommentId ? "comments.replyPlaceholder" : "comments.placeholder")}
          aria-invalid={!!errors.content}
          aria-label={t("comments.yourComment")}
          {...register("content")}
        />
        <FieldError errors={[errors.content]} />
      </Field>
      <Button type="submit" size="sm" className="w-fit" disabled={postComment.isPending}>
        {t("comments.post")}
      </Button>
    </form>
  )
}
