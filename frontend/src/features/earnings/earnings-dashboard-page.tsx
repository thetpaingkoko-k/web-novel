import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { BanknoteArrowUp, CheckCircle2, Clock, Coins, Receipt, Wallet } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { StatCard } from "@/components/stat-card"
import { StudioHero } from "@/components/studio-hero"
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

  const { pending, paid } = useMemo(() => {
    const list = withdrawals ?? []
    return {
      pending: list
        .filter((w) => w.status === "pending")
        .reduce((sum, w) => sum + w.amount, 0),
      paid: list.filter((w) => w.status === "paid").reduce((sum, w) => sum + w.amount, 0),
    }
  }, [withdrawals])

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
      onError: (error) => {
        const code = isAxiosError(error)
          ? (error.response?.data as { code?: string } | undefined)?.code
          : undefined
        if (code === "insufficient_balance") {
          toast.error(
            t("earnings.withdrawalTooMuch", {
              amount: (balance?.availableBalance ?? 0).toLocaleString(),
            })
          )
        } else if (code === "below_minimum") {
          toast.error(t("earnings.withdrawalBelowMin"))
        } else {
          toast.error(t("common.genericError"))
        }
      },
    })
  })

  if (balanceError) {
    return <QueryError onRetry={() => refetchBalance()} />
  }

  return (
    <div className="flex flex-col gap-8">
      <StudioHero
        eyebrow={t("earnings.eyebrow")}
        icon={Coins}
        title={t("earnings.title")}
        subtitle={t("earnings.subtitle")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {balanceLoading || !balance ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={Wallet}
              label={t("earnings.availableBalance")}
              value={t("earnings.mmk", { amount: balance.availableBalance })}
              className="glow-brand-hover border-primary/25 bg-primary/5"
            />
            <StatCard
              icon={Coins}
              label={t("earnings.totalEarned")}
              value={t("earnings.mmk", { amount: balance.totalEarned })}
            />
            <StatCard
              icon={Clock}
              label={t("earnings.pendingWithdrawals")}
              value={t("earnings.mmk", { amount: pending })}
            />
            <StatCard
              icon={CheckCircle2}
              label={t("earnings.paidOut")}
              value={t("earnings.mmk", { amount: paid })}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BanknoteArrowUp className="h-4 w-4" aria-hidden="true" />
            </span>
            {t("earnings.requestWithdrawal")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.amount}>
                  <FieldLabel htmlFor="withdrawal-amount">{t("earnings.amount")}</FieldLabel>
                  <Input
                    id="withdrawal-amount"
                    type="number"
                    aria-invalid={!!errors.amount}
                    {...register("amount", { valueAsNumber: true })}
                  />
                  <FieldError errors={[errors.amount]} />
                </Field>
                <Field>
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
              </div>
              <Field data-invalid={!!errors.payoutWalletNumber} className="sm:max-w-sm">
                <FieldLabel htmlFor="withdrawal-number">{t("earnings.walletNumber")}</FieldLabel>
                <Input
                  id="withdrawal-number"
                  inputMode="numeric"
                  aria-invalid={!!errors.payoutWalletNumber}
                  {...register("payoutWalletNumber")}
                />
                <FieldError errors={[errors.payoutWalletNumber]} />
              </Field>
              <Button type="submit" className="glow-brand-hover w-fit" disabled={requestWithdrawal.isPending}>
                <BanknoteArrowUp className="h-4 w-4" aria-hidden="true" />
                {t("common.submit")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t("earnings.history")}</h2>
        {withdrawalsLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : withdrawals && withdrawals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent>
              <EmptyState icon={Receipt} message={t("earnings.noWithdrawalsYet")} />
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t("earnings.amount")}</TableHead>
                    <TableHead>{t("earnings.walletProvider")}</TableHead>
                    <TableHead>{t("earnings.status")}</TableHead>
                    <TableHead className="text-right">{t("earnings.requestedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals?.map((w) => (
                    <TableRow key={w.withdrawalId}>
                      <TableCell className="font-medium tabular-nums">
                        {t("earnings.mmk", { amount: w.amount })}
                      </TableCell>
                      <TableCell>{w.payoutWalletProvider}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>
                          {t("earnings.withdrawalStatus." + w.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {new Date(w.requestedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t("earnings.ledger")}</h2>
        {earningsLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : earnings && earnings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent>
              <EmptyState icon={Receipt} message={t("earnings.noEarningsYet")} />
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t("earnings.gross")}</TableHead>
                    <TableHead>{t("earnings.fee")}</TableHead>
                    <TableHead>{t("earnings.net")}</TableHead>
                    <TableHead className="text-right">{t("earnings.requestedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings?.map((e) => (
                    <TableRow key={e.earningId}>
                      <TableCell className="tabular-nums">{t("earnings.mmk", { amount: e.grossAmount })}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {t("earnings.mmk", { amount: e.platformFeeAmount })}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums text-primary">
                        {t("earnings.mmk", { amount: e.netAmount })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
