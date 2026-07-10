import { zodResolver } from "@hookform/resolvers/zod"
import { Receipt } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/features/auth/auth-context"
import {
  useAuthorBalance,
  useAuthorEarnings,
  useAuthorWithdrawals,
  useRequestWithdrawal,
} from "./api"
import { buildWithdrawalSchema, type WithdrawalFormSchema } from "./schemas"

const WALLET_PROVIDERS = ["KBZPay", "WavePay", "AYAPay", "other"] as const

export function EarningsDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const authorId = user?.userId ?? Number.NaN

  const { data: balance, isLoading: balanceLoading, isError: balanceError, refetch: refetchBalance } =
    useAuthorBalance(authorId)
  const { data: earnings, isLoading: earningsLoading } = useAuthorEarnings(authorId)
  const { data: withdrawals, isLoading: withdrawalsLoading } = useAuthorWithdrawals(authorId)
  const requestWithdrawal = useRequestWithdrawal(authorId)
  const schema = useMemo(() => buildWithdrawalSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WithdrawalFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, payoutWalletProvider: "KBZPay", payoutWalletNumber: "" },
  })

  const onSubmit = handleSubmit((values) => {
    requestWithdrawal.mutate(values, {
      onSuccess: () => {
        toast.success(t("earnings.withdrawalRequested"))
        reset()
      },
      onError: () => toast.error(t("common.genericError")),
    })
  })

  if (balanceError) {
    return <QueryError onRetry={() => refetchBalance()} />
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{t("earnings.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("earnings.availableBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading || !balance ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-3xl font-semibold">{t("earnings.mmk", { amount: balance.availableBalance })}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("earnings.totalEarned")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading || !balance ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-3xl font-semibold">{t("earnings.mmk", { amount: balance.totalEarned })}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("earnings.requestWithdrawal")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.amount} className="max-w-48">
                <FieldLabel htmlFor="withdrawal-amount">{t("earnings.amount")}</FieldLabel>
                <Input
                  id="withdrawal-amount"
                  type="number"
                  aria-invalid={!!errors.amount}
                  {...register("amount", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field className="max-w-48">
                <FieldLabel htmlFor="withdrawal-provider">{t("earnings.walletProvider")}</FieldLabel>
                <Select
                  value={watch("payoutWalletProvider")}
                  onValueChange={(v) => setValue("payoutWalletProvider", v as WithdrawalFormSchema["payoutWalletProvider"])}
                >
                  <SelectTrigger id="withdrawal-provider">
                    <SelectValue />
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
                <FieldLabel htmlFor="withdrawal-number">{t("earnings.walletNumber")}</FieldLabel>
                <Input
                  id="withdrawal-number"
                  aria-invalid={!!errors.payoutWalletNumber}
                  {...register("payoutWalletNumber")}
                />
                <FieldError errors={[errors.payoutWalletNumber]} />
              </Field>
              <Button type="submit" className="w-fit" disabled={requestWithdrawal.isPending}>
                {t("common.submit")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-medium">{t("earnings.history")}</h2>
        {withdrawalsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : withdrawals && withdrawals.length === 0 ? (
          <EmptyState icon={Receipt} message={t("earnings.noWithdrawalsYet")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("earnings.amount")}</TableHead>
                <TableHead>{t("earnings.walletProvider")}</TableHead>
                <TableHead>{t("earnings.status")}</TableHead>
                <TableHead>{t("earnings.requestedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals?.map((w) => (
                <TableRow key={w.withdrawalId}>
                  <TableCell>{t("earnings.mmk", { amount: w.amount })}</TableCell>
                  <TableCell>{w.payoutWalletProvider}</TableCell>
                  <TableCell>
                    <Badge variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>
                      {t("earnings.withdrawalStatus." + w.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(w.requestedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">{t("earnings.ledger")}</h2>
        {earningsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : earnings && earnings.length === 0 ? (
          <EmptyState icon={Receipt} message={t("earnings.noEarningsYet")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("earnings.gross")}</TableHead>
                <TableHead>{t("earnings.fee")}</TableHead>
                <TableHead>{t("earnings.net")}</TableHead>
                <TableHead>{t("earnings.requestedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings?.map((e) => (
                <TableRow key={e.earningId}>
                  <TableCell>{t("earnings.mmk", { amount: e.grossAmount })}</TableCell>
                  <TableCell>{t("earnings.mmk", { amount: e.platformFeeAmount })}</TableCell>
                  <TableCell>{t("earnings.mmk", { amount: e.netAmount })}</TableCell>
                  <TableCell>{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
