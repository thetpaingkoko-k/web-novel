import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useCreateFeedPost } from "../api"
import { buildFeedPostSchema, type FeedPostFormSchema } from "../schemas"

export function FeedComposer({ authorId }: { authorId: number }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  // Only a monetized (professional) author has subscribers, so only they can hold a
  // post back for them — the backend rejects `premiumOnly` from anyone else, and a
  // hobbyist's feed is served in full to every viewer regardless of the flag.
  const canRestrictToSubscribers = user?.isMonetizationEnabled ?? false
  const createPost = useCreateFeedPost(authorId)
  const schema = useMemo(() => buildFeedPostSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeedPostFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "", premiumOnly: false },
  })

  const onSubmit = handleSubmit((values) => {
    createPost.mutate(values, {
      onSuccess: () => {
        toast.success(t("feed.posted"))
        reset()
      },
      onError: () => toast.error(t("common.genericError")),
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("feed.composeTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="feed-title">{t("feed.postTitle")}</FieldLabel>
              <Input id="feed-title" aria-invalid={!!errors.title} {...register("title")} />
              <FieldError errors={[errors.title]} />
            </Field>
            <Field data-invalid={!!errors.content}>
              <FieldLabel htmlFor="feed-content">{t("feed.postContent")}</FieldLabel>
              <Textarea id="feed-content" rows={4} aria-invalid={!!errors.content} {...register("content")} />
              <FieldError errors={[errors.content]} />
            </Field>
            {canRestrictToSubscribers ? (
              <Field orientation="horizontal">
                <FieldLabel htmlFor="feed-premium">{t("feed.premiumOnly")}</FieldLabel>
                <Switch
                  id="feed-premium"
                  checked={watch("premiumOnly")}
                  onCheckedChange={(checked) => setValue("premiumOnly", checked)}
                />
              </Field>
            ) : (
              <Field>
                <FieldDescription>{t("feed.premiumOnlyUnavailable")}</FieldDescription>
              </Field>
            )}
            <Button type="submit" className="w-fit" disabled={createPost.isPending}>
              {t("feed.publish")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
