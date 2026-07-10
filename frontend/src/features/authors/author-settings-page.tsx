import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { QueryError } from "@/components/query-error"
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
import { Textarea } from "@/components/ui/textarea"
import type { WalletProvider } from "@/types/subscriptions"
import { useAuth } from "@/features/auth/auth-context"
import { useMyAuthorProfile, useUpdateAuthorProfile } from "./api"
import { buildAuthorSettingsSchema, type AuthorSettingsFormSchema } from "./schemas"

const WALLET_PROVIDERS: WalletProvider[] = ["KBZPay", "WavePay", "AYAPay", "other"]

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
      monthlySubscriptionPrice: null,
      payoutWalletProvider: null,
      payoutWalletNumber: "",
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        bio: profile.bio ?? "",
        monthlySubscriptionPrice: profile.monthlySubscriptionPrice,
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
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const canSetPrice = profile.isMonetizationEnabled

  const onSubmit = handleSubmit((values) => {
    update.mutate(
      {
        bio: values.bio,
        monthlySubscriptionPrice: canSetPrice ? values.monthlySubscriptionPrice : null,
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
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("authors.settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.bio}>
                <FieldLabel htmlFor="settings-bio">{t("authors.bioLabel")}</FieldLabel>
                <Textarea id="settings-bio" rows={4} aria-invalid={!!errors.bio} {...register("bio")} />
                <FieldError errors={[errors.bio]} />
              </Field>

              <Field data-invalid={!!errors.monthlySubscriptionPrice}>
                <FieldLabel htmlFor="settings-price">{t("authors.priceLabel")}</FieldLabel>
                <Input
                  id="settings-price"
                  type="number"
                  min={0}
                  disabled={!canSetPrice}
                  aria-invalid={!!errors.monthlySubscriptionPrice}
                  {...register("monthlySubscriptionPrice", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                />
                <FieldDescription>
                  {canSetPrice ? t("authors.priceHint") : t("authors.priceLockedHint")}
                </FieldDescription>
                <FieldError errors={[errors.monthlySubscriptionPrice]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="settings-wallet-provider">
                  {t("authors.payoutWalletProvider")}
                </FieldLabel>
                <Select
                  value={watch("payoutWalletProvider") ?? undefined}
                  onValueChange={(v) => setValue("payoutWalletProvider", v as WalletProvider)}
                >
                  <SelectTrigger id="settings-wallet-provider">
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

              <Field data-invalid={!!errors.payoutWalletNumber}>
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

              <Button type="submit" className="w-fit" disabled={update.isPending}>
                {t("common.save")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
