import { zodResolver } from "@hookform/resolvers/zod"
import { Settings2, UserRound, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { QueryError } from "@/components/query-error"
import { StudioHero } from "@/components/studio-hero"
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
import { Textarea } from "@/components/ui/textarea"
import type { WalletProvider } from "@/types/subscriptions"
import { useAuth } from "@/features/auth/auth-context"
import { useMyAuthorProfile, useUpdateAuthorProfile } from "./api"
import { buildAuthorSettingsSchema, type AuthorSettingsFormSchema } from "./schemas"

const WALLET_PROVIDERS: WalletProvider[] = ["KBZPay", "WavePay", "AYAPay", "other"]

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

export function AuthorSettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAuthor = Boolean(user)
  const { data: profile, isLoading, isError, refetch } = useMyAuthorProfile(isAuthor)
  const update = useUpdateAuthorProfile()
  const schema = useMemo(() => buildAuthorSettingsSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AuthorSettingsFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: "",
      payoutWalletProvider: null,
      payoutWalletNumber: "",
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        bio: profile.bio ?? "",
        payoutWalletProvider: profile.payoutWalletProvider,
        payoutWalletNumber: profile.payoutWalletNumber ?? "",
      })
    }
  }, [profile, reset])

  if (isError) {
    return <QueryError onRetry={() => refetch()} />
  }

  if (isLoading || !profile) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  const onSubmit = handleSubmit((values) => {
    update.mutate(
      {
        bio: values.bio,
        payoutWalletProvider: values.payoutWalletProvider,
        payoutWalletNumber: values.payoutWalletNumber || null,
      },
      {
        onSuccess: () => toast.success(t("authors.settingsSaved")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <StudioHero
        eyebrow={t("authors.studioEyebrow")}
        icon={Settings2}
        title={t("authors.settingsTitle")}
        subtitle={t("authors.settingsSubtitle")}
      />

      <Card>
        <CardContent className="pt-2">
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <SectionHeading icon={UserRound} title={t("authors.profileSection")} />

              <Field data-invalid={!!errors.bio}>
                <FieldLabel htmlFor="settings-bio">{t("authors.bioLabel")}</FieldLabel>
                <Textarea id="settings-bio" rows={4} aria-invalid={!!errors.bio} {...register("bio")} />
                <FieldDescription>{t("authors.bioHint")}</FieldDescription>
                <FieldError errors={[errors.bio]} />
              </Field>

              {profile.isMonetizationEnabled && (
                <Field>
                  <FieldLabel>{t("authors.priceLabel")}</FieldLabel>
                  <p className="text-sm font-medium">
                    {t("subscribe.priceLabel", { price: profile.monthlySubscriptionPrice ?? 0 })}
                  </p>
                  <FieldDescription>{t("authors.priceLockedHint")}</FieldDescription>
                </Field>
              )}

              <Separator />

              <SectionHeading
                icon={Wallet}
                title={t("authors.payoutSection")}
                description={t("authors.payoutHint")}
              />

              <Field>
                <FieldLabel htmlFor="settings-wallet-provider">
                  {t("authors.payoutWalletProvider")}
                </FieldLabel>
                <Select
                  value={watch("payoutWalletProvider") ?? undefined}
                  onValueChange={(v) => setValue("payoutWalletProvider", v as WalletProvider)}
                >
                  <SelectTrigger id="settings-wallet-provider" className="max-w-xs">
                    <SelectValue placeholder={t("authors.selectProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {WALLET_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={!!errors.payoutWalletNumber} className="max-w-xs">
                <FieldLabel htmlFor="settings-wallet-number">
                  {t("authors.payoutWalletNumber")}
                </FieldLabel>
                <Input
                  id="settings-wallet-number"
                  inputMode="numeric"
                  aria-invalid={!!errors.payoutWalletNumber}
                  {...register("payoutWalletNumber")}
                />
                <FieldError errors={[errors.payoutWalletNumber]} />
              </Field>

              <Separator />

              <Button type="submit" className="glow-brand-hover w-fit" disabled={update.isPending}>
                {t("common.save")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
