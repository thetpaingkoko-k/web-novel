import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import {
  ArrowRight,
  BanknoteArrowUp,
  CheckCircle2,
  Clock,
  Coins,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { QueryError } from "@/components/query-error"
import { StatCard } from "@/components/stat-card"
import { StudioHero } from "@/components/studio-hero"
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
import { useAuth } from "@/features/auth/auth-context"
import { useAuthorBalance, useAuthorWithdrawals, useRequestWithdrawal } from "./api"
import { EarningsNav } from "./earnings-nav"
import { buildWithdrawalSchema, type WithdrawalFormSchema } from "./schemas"

const WALLET_PROVIDERS = ["KBZPay", "WavePay", "AYAPay"] as const

export function EarningsDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const authorId = user?.userId ?? Number.NaN

  const { data: balance, isLoading: balanceLoading, isError: balanceError, refetch: refetchBalance } =
    useAuthorBalance(authorId)
  const { data: withdrawals } = useAuthorWithdrawals(authorId)
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

      <EarningsNav />

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

      <div className="grid gap-4 sm:grid-cols-2">
        <EarningsLinkCard
          to="/author/earnings/ledger"
          icon={Receipt}
          title={t("earnings.ledger")}
          description={t("earnings.viewLedgerDescription")}
          cta={t("earnings.viewLedger")}
        />
        <EarningsLinkCard
          to="/author/earnings/withdrawals"
          icon={Wallet}
          title={t("earnings.history")}
          description={t("earnings.viewWithdrawalsDescription")}
          cta={t("earnings.viewWithdrawals")}
        />
      </div>
    </div>
  )
}

/** A navigable summary card standing in for a full table on the overview page. */
function EarningsLinkCard({
  to,
  icon: Icon,
  title,
  description,
  cta,
}: {
  to: string
  icon: LucideIcon
  title: string
  description: string
  cta: string
}) {
  return (
    <Card className="hover-lift group/link">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-fit" asChild>
          <Link to={to}>
            {cta}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
