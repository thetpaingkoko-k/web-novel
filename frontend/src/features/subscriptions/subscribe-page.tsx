import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { BadgeCheck, Check, Clock, Sparkles, Wallet as WalletIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { resolveUploadUrl } from "@/api/uploads"
import { EmptyState } from "@/components/empty-state"
import { ImageUploadField } from "@/components/image-upload-field"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAuthorProfile } from "@/features/authors/api"
import type { Wallet } from "@/types/subscriptions"
import { useSubmitPayment, useSubscriptionTo, useWallets } from "./api"
import { buildPaymentSchema, type PaymentFormSchema } from "./schemas"

/** Maps a payment-submission error code to a localized message key. */
const SUBMIT_ERROR_KEYS: Record<string, string> = {
  "wallet.none_active": "subscribe.err.noActiveWallet",
  "wallet.not_active": "subscribe.err.walletNotActive",
  "author.not_monetized": "subscribe.err.notMonetized",
  "subscription.already_active": "subscribe.err.alreadyActive",
}

export function SubscribePage() {
  const { t } = useTranslation()
  const { authorId: authorIdParam } = useParams<{ authorId: string }>()
  const authorId = Number(authorIdParam)
  const [submitted, setSubmitted] = useState(false)

  const { data: author, isLoading: authorLoading, isError: authorError, refetch: refetchAuthor } =
    useAuthorProfile(authorId)
  const { data: wallets, isLoading: walletsLoading, isError: walletsError, refetch: refetchWallets } =
    useWallets()
  const { subscription, isLoading: subLoading } = useSubscriptionTo(authorId)
  const submitPayment = useSubmitPayment(authorId)
  const schema = useMemo(() => buildPaymentSchema(t), [t])

  const {
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<PaymentFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { walletId: 0, screenshotUrl: "", last6Digits: "" },
  })

  const activeWallets = useMemo(() => wallets?.filter((w) => w.isActive) ?? [], [wallets])
  const selectedWalletId = watch("walletId")
  const selectedWallet = activeWallets.find((w) => w.walletId === selectedWalletId)

  // Preselect the first active wallet once the list loads.
  useEffect(() => {
    if (!selectedWalletId && activeWallets.length > 0) {
      setValue("walletId", activeWallets[0].walletId, { shouldValidate: false })
    }
  }, [activeWallets, selectedWalletId, setValue])

  if (authorError || walletsError) {
    return (
      <QueryError
        onRetry={() => {
          refetchAuthor()
          refetchWallets()
        }}
      />
    )
  }

  if (authorLoading || walletsLoading || subLoading || !author || !wallets) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const price = author.monthlySubscriptionPrice ?? 5000

  // Already committed: hide the payment form and show the current state so the
  // reader never sees a lingering subscribe CTA (no double subscribe).
  if (subscription) {
    const pending = subscription.status === "pending_payment"
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Card className="glow-brand overflow-hidden rounded-2xl border-border/70">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl",
                pending ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
              )}
              aria-hidden="true"
            >
              {pending ? <Clock className="size-7" /> : <BadgeCheck className="size-7" />}
            </span>
            <h1 className="font-display text-xl font-bold tracking-tight">
              {pending
                ? t("subscribe.pendingTitle")
                : t("subscribe.activeTitle", { author: author.username })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pending
                ? t("subscribe.pendingReview", { author: author.username })
                : t("subscribe.activeBody", { author: author.username })}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/subscriptions/me">{t("nav.mySubscriptions")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to={`/authors/${authorId}`}>{t("authors.viewProfile")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
      {
        walletId: values.walletId,
        screenshotUrl: values.screenshotUrl,
        last6Digits: values.last6Digits,
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (error) => {
          const code = isAxiosError(error)
            ? (error.response?.data as { code?: string } | undefined)?.code
            : undefined
          toast.error(t((code && SUBMIT_ERROR_KEYS[code]) || "common.genericError"))
        },
      }
    )
  })

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
          {/* Fixed monthly price — amount is server-set, not editable. */}
          <div className="rounded-xl border border-border/70 bg-muted/50 p-3 text-sm">
            <p className="font-medium">{t("subscribe.monthlyPrice", { price })}</p>
          </div>

          {activeWallets.length === 0 ? (
            <EmptyState icon={WalletIcon} message={t("subscribe.noActiveWallet")} />
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                {/* Wallet picker — choose which platform wallet to pay into. */}
                <Field data-invalid={!!errors.walletId}>
                  <FieldLabel>{t("subscribe.chooseWallet")}</FieldLabel>
                  <div
                    role="radiogroup"
                    aria-label={t("subscribe.chooseWallet")}
                    className="flex flex-col gap-2"
                  >
                    {activeWallets.map((wallet) => (
                      <WalletOption
                        key={wallet.walletId}
                        wallet={wallet}
                        selected={wallet.walletId === selectedWalletId}
                        onSelect={() =>
                          setValue("walletId", wallet.walletId, { shouldValidate: true })
                        }
                      />
                    ))}
                  </div>
                  <FieldError errors={[errors.walletId]} />
                </Field>

                {/* QR for the selected wallet, when available. */}
                {selectedWallet?.qrImageUrl && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-muted/40 p-4 text-center">
                    <p className="text-sm font-medium">{t("subscribe.scanToPay")}</p>
                    <img
                      src={resolveUploadUrl(selectedWallet.qrImageUrl)}
                      alt={t("subscribe.scanToPay")}
                      className="size-48 rounded-lg border border-border/70 bg-white object-contain p-2"
                    />
                  </div>
                )}

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
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** One selectable platform wallet in the picker — provider, number, and payee name. */
function WalletOption({
  wallet,
  selected,
  onSelect,
}: {
  wallet: Wallet
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/70 bg-card hover:border-primary/40"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
        aria-hidden="true"
      >
        <WalletIcon className="size-4.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{wallet.provider}</span>
        <span className="truncate text-xs text-muted-foreground tabular-nums">
          {wallet.walletNumber}
        </span>
        {wallet.accountName && (
          <span className="truncate text-xs text-muted-foreground">
            {t("subscribe.payeeName", { name: wallet.accountName })}
          </span>
        )}
      </div>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
        )}
        aria-hidden="true"
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  )
}
