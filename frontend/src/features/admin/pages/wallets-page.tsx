import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Plus, PowerOff, WalletCards } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { resolveUploadUrl } from "@/api/uploads"
import { ImageUploadField } from "@/components/image-upload-field"
import { QueryError } from "@/components/query-error"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { WalletProvider } from "@/types/subscriptions"
import { useAddWallet, useAdminWallets, useDeactivateWallet } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { StatusPill } from "../components/admin-primitives"

const PROVIDERS: WalletProvider[] = ["KBZPay", "WavePay", "AYAPay", "other"]

export function WalletsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAdminWallets()
  const addWallet = useAddWallet()
  const deactivate = useDeactivateWallet()

  const schema = useMemo(
    () =>
      z.object({
        provider: z.enum(["KBZPay", "WavePay", "AYAPay", "other"]),
        walletNumber: z.string().min(1, t("validation.required")),
        qrImageUrl: z.string(),
      }),
    [t]
  )
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { provider: "KBZPay", walletNumber: "", qrImageUrl: "" },
  })

  const onSubmit = handleSubmit((values) => {
    addWallet.mutate(
      { ...values, qrImageUrl: values.qrImageUrl || null },
      {
      onSuccess: () => {
        toast.success(t("admin.walletAdded"))
        reset()
      },
      onError: () => toast.error(t("common.genericError")),
    })
  })

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.wallets")}
        description={t("admin.desc.wallets")}
        icon={WalletCards}
      />

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="size-4 text-primary" aria-hidden />
            {t("admin.addWallet")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field className="max-w-48">
                <FieldLabel htmlFor="wallet-provider">{t("earnings.walletProvider")}</FieldLabel>
                <Select
                  value={watch("provider")}
                  onValueChange={(v) => setValue("provider", v as WalletProvider)}
                >
                  <SelectTrigger id="wallet-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={!!errors.walletNumber}>
                <FieldLabel htmlFor="wallet-number">{t("earnings.walletNumber")}</FieldLabel>
                <Input id="wallet-number" aria-invalid={!!errors.walletNumber} {...register("walletNumber")} />
                <FieldError errors={[errors.walletNumber]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="wallet-qr">{t("admin.walletQr")}</FieldLabel>
                <ImageUploadField
                  id="wallet-qr"
                  value={watch("qrImageUrl")}
                  onChange={(url) => setValue("qrImageUrl", url, { shouldDirty: true })}
                />
              </Field>
              <Button type="submit" className="w-fit" disabled={addWallet.isPending}>
                <Plus />
                {t("admin.addWallet")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {isError && <QueryError onRetry={() => refetch()} />}

      {isLoading && <Skeleton className="h-24 w-full rounded-2xl" />}

      {!isError && !isLoading && data && (
        <ul className="flex flex-col gap-2">
          {data.map((wallet) => (
            <li
              key={wallet.walletId}
              className="hover-lift flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3 text-sm">
                {wallet.qrImageUrl ? (
                  <img
                    src={resolveUploadUrl(wallet.qrImageUrl)}
                    alt={t("admin.walletQr")}
                    className="size-10 shrink-0 rounded-xl border border-border/70 object-cover"
                  />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <WalletCards className="size-5" aria-hidden />
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium">{wallet.provider}</span>
                  <span className="text-muted-foreground">{wallet.walletNumber}</span>
                </div>
                <StatusPill
                  tone={wallet.isActive ? "success" : "muted"}
                  icon={wallet.isActive ? CheckCircle2 : PowerOff}
                  className="ml-1"
                >
                  {t(wallet.isActive ? "admin.walletActive" : "admin.walletInactive")}
                </StatusPill>
              </div>
              {wallet.isActive && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="warning" size="sm">
                      <PowerOff />
                      {t("admin.deactivate")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                          <PowerOff className="size-5" aria-hidden />
                        </span>
                        <div className="space-y-1">
                          <AlertDialogTitle>{t("admin.deactivateWalletTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("admin.deactivateWalletBody")}</AlertDialogDescription>
                        </div>
                      </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-warning text-white hover:bg-warning/90"
                        onClick={() =>
                          deactivate.mutate(wallet.walletId, {
                            onSuccess: () => toast.success(t("admin.walletDeactivated")),
                            onError: () => toast.error(t("common.genericError")),
                          })
                        }
                      >
                        {t("admin.deactivate")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
