import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
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
import { Badge } from "@/components/ui/badge"
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
    defaultValues: { provider: "KBZPay", walletNumber: "" },
  })

  const onSubmit = handleSubmit((values) => {
    addWallet.mutate(values, {
      onSuccess: () => {
        toast.success(t("admin.walletAdded"))
        reset()
      },
      onError: () => toast.error(t("common.genericError")),
    })
  })

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.addWallet")}</CardTitle>
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
              <Button type="submit" className="w-fit" disabled={addWallet.isPending}>
                {t("admin.addWallet")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {isError && <QueryError onRetry={() => refetch()} />}

      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isError && !isLoading && data && (
        <ul className="flex flex-col gap-2">
          {data.map((wallet) => (
            <li key={wallet.walletId} className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">{wallet.provider}</span>
                <span className="text-muted-foreground">{wallet.walletNumber}</span>
                <Badge variant={wallet.isActive ? "default" : "secondary"}>
                  {t(wallet.isActive ? "admin.walletActive" : "admin.walletInactive")}
                </Badge>
              </div>
              {wallet.isActive && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t("admin.deactivate")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("admin.deactivateWalletTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("admin.deactivateWalletBody")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
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
