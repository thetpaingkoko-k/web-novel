import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Plus, PowerOff, WalletCards } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { resolveUploadUrl } from "@/api/uploads"
import { ImageUploadField } from "@/components/image-upload-field"
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
import type { AdminWallet } from "@/types/subscriptions"
import type { WalletProvider } from "@/types/subscriptions"
import { useAddWallet, useAdminWallets, useDeactivateWallet } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { StatusPill } from "../components/admin-primitives"
import { DataTable, type DataColumn, type RowAction } from "../components/data-table"

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
        accountName: z.string().max(100, t("admin.walletAccountNameTooLong")),
        qrImageUrl: z.string(),
      }),
    [t],
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
    defaultValues: { provider: "KBZPay", walletNumber: "", accountName: "", qrImageUrl: "" },
  })

  const onSubmit = handleSubmit((values) => {
    addWallet.mutate(
      { ...values, accountName: values.accountName || null, qrImageUrl: values.qrImageUrl || null },
      {
        onSuccess: () => {
          toast.success(t("admin.walletAdded"))
          reset()
        },
        onError: () => toast.error(t("common.genericError")),
      },
    )
  })

  const columns: DataColumn<AdminWallet>[] = [
    {
      key: "provider",
      header: t("earnings.walletProvider"),
      sortValue: (w) => w.provider,
      cell: (w) => (
        <div className="flex items-center gap-3">
          {w.qrImageUrl ? (
            <img
              src={resolveUploadUrl(w.qrImageUrl)}
              alt={t("admin.walletQr")}
              className="size-9 shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <WalletCards className="size-4" aria-hidden />
            </span>
          )}
          <span className="font-medium">{w.provider}</span>
        </div>
      ),
    },
    {
      key: "walletNumber",
      header: t("earnings.walletNumber"),
      cellClassName: "tabular-nums",
      sortValue: (w) => w.walletNumber,
      cell: (w) => w.walletNumber,
    },
    {
      key: "accountName",
      header: t("admin.walletAccountName"),
      cell: (w) =>
        w.accountName ? (
          <span className="text-sm">{w.accountName}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: t("admin.table.status"),
      sortValue: (w) => (w.isActive ? 0 : 1),
      cell: (w) => (
        <StatusPill
          tone={w.isActive ? "success" : "muted"}
          icon={w.isActive ? CheckCircle2 : PowerOff}
        >
          {t(w.isActive ? "admin.walletActive" : "admin.walletInactive")}
        </StatusPill>
      ),
    },
  ]

  function rowActions(w: AdminWallet): RowAction[] {
    if (!w.isActive) return []
    return [
      {
        key: "deactivate",
        label: t("admin.deactivate"),
        icon: PowerOff,
        tone: "destructive",
        onSelect: () =>
          deactivate.mutate(w.walletId, {
            onSuccess: () => toast.success(t("admin.walletDeactivated")),
            onError: () => toast.error(t("common.genericError")),
          }),
        confirm: {
          title: t("admin.deactivateWalletTitle"),
          description: t("admin.deactivateWalletBody"),
          confirmLabel: t("admin.deactivate"),
          tone: "warning",
          icon: PowerOff,
        },
      },
    ]
  }

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
              <Field data-invalid={!!errors.accountName}>
                <FieldLabel htmlFor="wallet-account-name">{t("admin.walletAccountName")}</FieldLabel>
                <Input
                  id="wallet-account-name"
                  aria-invalid={!!errors.accountName}
                  {...register("accountName")}
                />
                <FieldError errors={[errors.accountName]} />
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

      <DataTable
        data={data}
        getRowId={(w) => w.walletId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={WalletCards}
        emptyMessage={t("admin.walletsEmpty")}
        columns={columns}
        rowActions={rowActions}
      />
    </div>
  )
}
