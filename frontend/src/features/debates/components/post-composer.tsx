import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { subscriptionKeys } from "@/features/subscriptions/api"
import { useCreatePost } from "../api"
import { buildPostSchema, type PostFormSchema } from "../schemas"

interface PostComposerProps {
  threadId: number
  parentPostId?: number
  onPosted?: () => void
  autoFocus?: boolean
}

export function PostComposer({ threadId, parentPostId, onPosted, autoFocus }: PostComposerProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const createPost = useCreatePost(threadId)
  const schema = useMemo(() => buildPostSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PostFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { content: "" },
  })

  const onSubmit = handleSubmit((values) => {
    createPost.mutate(
      { content: values.content, parentPostId },
      {
        onSuccess: () => {
          reset()
          onPosted?.()
        },
        onError: (error) => {
          if (
            isAxiosError<{ code?: string }>(error) &&
            error.response?.status === 403 &&
            error.response.data?.code === "no_subscription"
          ) {
            toast.error(t("debates.subscriptionRequired"))
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.mine })
          } else {
            toast.error(t("common.genericError"))
          }
        },
      }
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <Field data-invalid={!!errors.content}>
        <Textarea
          rows={parentPostId ? 2 : 3}
          autoFocus={autoFocus}
          placeholder={t(parentPostId ? "debates.replyPlaceholder" : "debates.postPlaceholder")}
          aria-label={t("debates.yourPost")}
          aria-invalid={!!errors.content}
          {...register("content")}
        />
        <FieldError errors={[errors.content]} />
      </Field>
      <Button type="submit" size="sm" className="w-fit" disabled={createPost.isPending}>
        {t("debates.post")}
      </Button>
    </form>
  )
}
