import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Clock, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { ImageUploadField } from "@/components/image-upload-field"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthorProfile } from "@/features/authors/api"
import { useActiveWallet, useSubmitPayment } from "./api"
import { buildPaymentSchema, type PaymentFormSchema } from "./schemas"

export function SubscribePage() {
  const { t } = useTranslation()
  const { authorId: authorIdParam } = useParams<{ authorId: string }>()
  const authorId = Number(authorIdParam)
  const [submitted, setSubmitted] = useState(false)

  const { data: author, isLoading: authorLoading, isError: authorError, refetch: refetchAuthor } =
    useAuthorProfile(authorId)
  const { data: wallet, isLoading: walletLoading, isError: walletError, refetch: refetchWallet } =
    useActiveWallet()
  const submitPayment = useSubmitPayment(authorId)
  const schema = useMemo(() => buildPaymentSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, screenshotUrl: "", last6Digits: "" },
  })

  useEffect(() => {
    if (author) reset({ amount: author.monthlySubscriptionPrice ?? 0, screenshotUrl: "", last6Digits: "" })
  }, [author, reset])

  if (authorError || walletError) {
    return (
      <QueryError
        onRetry={() => {
          refetchAuthor()
          refetchWallet()
        }}
      />
    )
  }

  if (authorLoading || walletLoading || !author || !wallet) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (submitted) {
    return (
      <EmptyState
        icon={Clock}
        message={t("subscribe.pendingReview", { author: author.username })}
      />
    )
  }

  const onSubmit = handleSubmit((values) => {
    submitPayment.mutate(
      { ...values, walletId: wallet.walletId },
      { onSuccess: () => setSubmitted(true) }
    )
  })

  const price = author.monthlySubscriptionPrice ?? 0
  const benefits = [
    t("subscribe.benefit1", { author: author.username }),
    t("subscribe.benefit2", { author: author.username }),
    t("subscribe.benefit3"),
  ]

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      {/* Plan card with brand price hero */}
      <Card className="glow-brand overflow-hidden rounded-2xl border-border/70">
        <div className="brand-gradient relative isolate overflow-hidden p-6 text-white">
          <div className="pointer-events-none absolute -top-12 -right-8 -z-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90">
            <Sparkles className="size-4" aria-hidden="true" />
            {t("subscribe.planHeading")}
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold tracking-tight">
            {t("subscribe.title", { author: author.username })}
          </h1>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold">{price.toLocaleString()}</span>
            <span className="text-sm text-white/85">MMK · {t("subscribe.perMonth")}</span>
          </p>
        </div>
        <CardContent className="pt-6">
          <p className="mb-3 text-sm font-medium">{t("subscribe.benefitsTitle")}</p>
          <ul className="flex flex-col gap-2.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Payment submission form */}
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">{t("subscribe.paymentHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl border border-border/70 bg-muted/50 p-3 text-sm">
            <p>{t("subscribe.priceLabel", { price })}</p>
            <p className="mt-1 text-muted-foreground">
              {t("subscribe.walletLabel", { provider: wallet.provider, number: wallet.walletNumber })}
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="payment-amount">{t("subscribe.amount")}</FieldLabel>
                <Input
                  id="payment-amount"
                  type="number"
                  aria-invalid={!!errors.amount}
                  {...register("amount", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.amount]} />
              </Field>

              <Field data-invalid={!!errors.last6Digits}>
                <FieldLabel htmlFor="payment-last6">{t("subscribe.last6Digits")}</FieldLabel>
                <Input
                  id="payment-last6"
                  maxLength={6}
                  inputMode="numeric"
                  aria-invalid={!!errors.last6Digits}
                  {...register("last6Digits")}
                />
                <FieldError errors={[errors.last6Digits]} />
              </Field>

              <Field data-invalid={!!errors.screenshotUrl}>
                <FieldLabel htmlFor="payment-screenshot">{t("subscribe.screenshot")}</FieldLabel>
                <ImageUploadField
                  id="payment-screenshot"
                  aria-invalid={!!errors.screenshotUrl}
                  value={watch("screenshotUrl")}
                  onChange={(url) =>
                    setValue("screenshotUrl", url, { shouldValidate: true, shouldDirty: true })
                  }
                />
                <FieldError errors={[errors.screenshotUrl]} />
              </Field>

              <Button type="submit" className="w-full" disabled={submitPayment.isPending}>
                {t("common.submit")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
