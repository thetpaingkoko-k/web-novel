import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { subscriptionKeys } from "@/features/subscriptions/api"
import type { ThreadLimitError } from "@/types/debates"
import { useCreateThread } from "../api"
import { buildThreadSchema, type ThreadFormSchema } from "../schemas"

export function CreateThreadDialog({ bookId }: { bookId: number }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const createThread = useCreateThread(bookId)
  const schema = useMemo(() => buildThreadSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ThreadFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { title: "" },
  })

  const onSubmit = handleSubmit((values) => {
    createThread.mutate(values, {
      onSuccess: () => {
        setOpen(false)
        reset()
      },
      onError: (error) => {
        if (isAxiosError<ThreadLimitError>(error) && error.response?.status === 409) {
          const code = error.response.data.code
          toast.error(
            t(code === "already_has_thread" ? "debates.alreadyHasThread" : "debates.bookWindowFull")
          )
        } else if (
          isAxiosError<{ code?: string }>(error) &&
          error.response?.status === 403 &&
          error.response.data?.code === "no_subscription"
        ) {
          // Lost/never had a subscription — surface the prompt and close.
          toast.error(t("debates.subscriptionRequired"))
          setOpen(false)
          queryClient.invalidateQueries({ queryKey: subscriptionKeys.mine })
        } else {
          toast.error(t("common.genericError"))
        }
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("debates.startDiscussion")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("debates.startDiscussion")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!errors.title}>
            <Input
              placeholder={t("debates.threadTitlePlaceholder")}
              aria-label={t("debates.threadTitle")}
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            <FieldError errors={[errors.title]} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={createThread.isPending}>
              {t("debates.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
