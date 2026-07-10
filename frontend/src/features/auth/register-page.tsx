import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "./auth-context"
import { buildRegisterSchema, type RegisterFormValues } from "./schemas"

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const schema = useMemo(() => buildRegisterSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "" },
  })

  const onSubmit = handleSubmit((values) => {
    registerUser.mutate(values, {
      onSuccess: () => navigate("/"),
      onError: () => toast.error(t("auth.registerFailed")),
    })
  })

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.registerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="register-username">{t("auth.username")}</FieldLabel>
                <Input
                  id="register-username"
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                  {...register("username")}
                />
                <FieldError errors={[errors.username]} />
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="register-email">{t("auth.email")}</FieldLabel>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="register-password">{t("auth.password")}</FieldLabel>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <Button type="submit" className="w-full" disabled={registerUser.isPending}>
                {t("auth.registerSubmit")}
              </Button>
            </FieldGroup>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.hasAccount")}{" "}
            <Link to="/login" className="text-primary underline underline-offset-4">
              {t("auth.loginSubmit")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
