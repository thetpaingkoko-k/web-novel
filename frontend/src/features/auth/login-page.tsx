import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "./auth-context"
import { buildLoginSchema, type LoginFormValues } from "./schemas"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const schema = useMemo(() => buildLoginSchema(t), [t])

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
    login.mutate(values, {
      onSuccess: () => navigate(redirectTo, { replace: true }),
      onError: () => toast.error(t("auth.invalidCredentials")),
    })
  })

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="login-email">{t("auth.email")}</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="login-password">{t("auth.password")}</FieldLabel>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {t("auth.loginSubmit")}
              </Button>
            </FieldGroup>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="text-primary underline underline-offset-4">
              {t("auth.registerSubmit")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
