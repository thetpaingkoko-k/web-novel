import { zodResolver } from "@hookform/resolvers/zod"
import { Clock, PenLine } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useApplyForAuthor } from "./api"
import { buildApplicationSchema, type ApplicationFormSchema } from "./schemas"

const AUTHOR_ROLES = ["hobbyist_author", "professional_author"]

export function AuthorApplicationPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const apply = useApplyForAuthor()
  const schema = useMemo(() => buildApplicationSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { bio: "" },
  })

  // Already an author — nothing to apply for.
  if (user && AUTHOR_ROLES.includes(user.role)) {
    return (
      <EmptyState
        icon={PenLine}
        message={t("authors.alreadyAuthor")}
        action={
          <Button asChild size="sm">
            <Link to="/author/books">{t("nav.myBooks")}</Link>
          </Button>
        }
      />
    )
  }

  // Application submitted and awaiting admin review.
  if (user?.status === "pending") {
    return <EmptyState icon={Clock} message={t("authors.applicationPending")} />
  }

  const onSubmit = handleSubmit((values) => {
    apply.mutate(values, {
      onSuccess: () => toast.success(t("authors.applicationSubmitted")),
      onError: () => toast.error(t("common.genericError")),
    })
  })

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("authors.becomeAuthorTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.bio}>
                <FieldLabel htmlFor="apply-bio">{t("authors.bioLabel")}</FieldLabel>
                <Textarea
                  id="apply-bio"
                  rows={6}
                  aria-invalid={!!errors.bio}
                  placeholder={t("authors.bioPlaceholder")}
                  {...register("bio")}
                />
                <FieldDescription>{t("authors.applyHint")}</FieldDescription>
                <FieldError errors={[errors.bio]} />
              </Field>
              <Button type="submit" className="w-fit" disabled={apply.isPending}>
                {t("authors.submitApplication")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
