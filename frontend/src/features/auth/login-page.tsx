import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import axios from "axios"
import { Ban, Lock, Mail, PauseCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-context"
import { AuthShell } from "./components/auth-shell"
import { GoogleAuthSection } from "./components/google-auth-section"
import { IconInput } from "./components/icon-input"
import { buildLoginSchema, type LoginFormValues } from "./schemas"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const schema = useMemo(() => buildLoginSchema(t), [t])
  // When the backend rejects a login because the account is blocked, we keep the
  // reason on the form as a persistent alert (not a transient toast).
  const [blocked, setBlocked] = useState<{ status: "suspended" | "banned"; reason: string } | null>(
    null
  )

  // Return to the page the user was sent from (e.g. a subscribe link) after login,
  // falling back to the home page. ProtectedRoute stashes it in location.state.from.
  const from = (location.state as { from?: Location })?.from
  const redirectTo = from ? `${from.pathname}${from.search}${from.hash}` : "/"

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit((values) => {
    setBlocked(null)
    login.mutate(values, {
      onSuccess: () => navigate(redirectTo, { replace: true }),
      onError: (error) => {
        const data = axios.isAxiosError(error)
          ? (error.response?.data as
              | { code?: string; details?: { status?: string; reason?: string } }
              | undefined)
          : undefined
        // Unverified account → route to the verify screen instead of a dead-end error.
        if (data?.code === "email_not_verified") {
          navigate("/verify-email", { state: { email: values.email } })
          return
        }
        // Suspended / banned account → show a persistent inline alert with the reason.
        if (data?.code === "account_blocked") {
          const status = data.details?.status === "banned" ? "banned" : "suspended"
          setBlocked({ status, reason: data.details?.reason ?? "" })
          return
        }
        toast.error(t("auth.invalidCredentials"))
      },
    })
  })

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("auth.registerSubmit")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {blocked && <BlockedAccountAlert status={blocked.status} reason={blocked.reason} />}
        <IconInput
          id="login-email"
          icon={Mail}
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <IconInput
          id="login-password"
          icon={Lock}
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" className="mt-1 h-11 w-full" disabled={login.isPending}>
          {t("auth.loginSubmit")}
        </Button>
      </form>
      <GoogleAuthSection onSuccess={() => navigate(redirectTo, { replace: true })} />
    </AuthShell>
  )
}

/** Persistent inline alert shown when a suspended/banned account tries to log in. */
function BlockedAccountAlert({
  status,
  reason,
}: {
  status: "suspended" | "banned"
  reason: string
}) {
  const { t } = useTranslation()
  const Icon = status === "banned" ? Ban : PauseCircle
  const title = status === "banned" ? t("auth.accountBannedTitle") : t("auth.accountSuspendedTitle")
  const trimmedReason = reason.trim()

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">{title}</p>
        {trimmedReason ? (
          <p className="text-destructive/90">
            <span className="font-medium">{t("auth.suspensionReasonLabel")}</span> {trimmedReason}
          </p>
        ) : (
          <p className="text-destructive/90">{t("auth.noReasonProvided")}</p>
        )}
      </div>
    </div>
  )
}
