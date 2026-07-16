import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import axios from "axios"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-context"
import { AuthShell } from "./components/auth-shell"
import { IconInput } from "./components/icon-input"
import { buildVerifyCodeSchema, type VerifyCodeFormValues } from "./schemas"

const RESEND_COOLDOWN_SECONDS = 60

function errorCode(error: unknown): string | undefined {
  return axios.isAxiosError(error)
    ? (error.response?.data as { code?: string } | undefined)?.code
    : undefined
}

/**
 * Second step of manual signup: the account is `pending` and a 6-digit code was
 * emailed. Verifying it logs the user in. Reached from register (fresh signup) or
 * from a login attempt on an unverified account — both pass the email in
 * router state; landing here without one bounces to register.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmail, resendCode } = useAuth()
  const schema = useMemo(() => buildVerifyCodeSchema(t), [t])
  const [cooldown, setCooldown] = useState(0)
  // Guards the auto-send so it fires once per mount (not on every re-render, and
  // not twice under React StrictMode's double-invoked effects in dev).
  const autoSentRef = useRef(false)

  const email = (location.state as { email?: string })?.email

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // Send the code as soon as the page opens, so the user never has to click
  // "resend" for the first code. Registration itself no longer emails — this is
  // the single, page-triggered send. Fires exactly once per mount.
  useEffect(() => {
    if (!email || autoSentRef.current) return
    autoSentRef.current = true
    resendCode.mutate(
      { email },
      {
        // Subtitle already tells the user a code was sent; just start the cooldown
        // so the manual "resend" button is disabled for the next 60s.
        onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
        onError: (error) => {
          const code = errorCode(error)
          if (code === "resend_too_soon") {
            // A recent code is still valid (e.g. arriving here from a login attempt).
            setCooldown(RESEND_COOLDOWN_SECONDS)
          } else if (code === "already_verified") {
            toast.info(t("auth.alreadyVerified"))
            navigate("/login", { replace: true })
          } else {
            toast.error(t("auth.genericError"))
          }
        },
      }
    )
    // Depend only on `email`: the ref guard already prevents duplicate sends, and
    // the mutation/navigation handles are stable enough for a fire-once effect.
  }, [email])

  // No email in navigation state → nothing to verify against.
  if (!email) return <Navigate to="/register" replace />

  const onSubmit = handleSubmit((values) => {
    verifyEmail.mutate(
      { email, code: values.code },
      {
        onSuccess: () => navigate("/", { replace: true }),
        onError: (error) => {
          if (errorCode(error) === "already_verified") {
            toast.info(t("auth.alreadyVerified"))
            navigate("/login", { replace: true })
            return
          }
          toast.error(t("auth.invalidCode"))
        },
      }
    )
  })

  const onResend = () => {
    resendCode.mutate(
      { email },
      {
        onSuccess: () => {
          toast.success(t("auth.codeResent"))
          setCooldown(RESEND_COOLDOWN_SECONDS)
        },
        onError: (error) => {
          const code = errorCode(error)
          if (code === "resend_too_soon") {
            toast.error(t("auth.resendTooSoon"))
            setCooldown(RESEND_COOLDOWN_SECONDS)
          } else if (code === "already_verified") {
            toast.info(t("auth.alreadyVerified"))
            navigate("/login", { replace: true })
          } else {
            toast.error(t("auth.genericError"))
          }
        },
      }
    )
  }

  return (
    <AuthShell
      title={t("auth.verifyTitle")}
      subtitle={t("auth.verifySubtitle", { email })}
      footer={
        <>
          {t("auth.wrongEmail")}{" "}
          <button
            type="button"
            onClick={() => navigate("/register", { replace: true })}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("auth.registerSubmit")}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <IconInput
          id="verify-code"
          icon={KeyRound}
          label={t("auth.verifyCodeLabel")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          error={errors.code?.message}
          {...register("code")}
        />
        <Button type="submit" className="mt-1 h-11 w-full" disabled={verifyEmail.isPending}>
          {t("auth.verifySubmit")}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-muted-foreground">
        {t("auth.noCode")}{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || resendCode.isPending}
          className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resendCode")}
        </button>
      </div>
    </AuthShell>
  )
}
