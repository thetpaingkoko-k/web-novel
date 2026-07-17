import { zodResolver } from "@hookform/resolvers/zod"
import { Clock, PenLine, Sparkles } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    defaultValues: { bio: "", writingMotivation: "", writingInterests: "" },
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div className="bg-mesh relative overflow-hidden rounded-2xl border border-border/70 p-8 text-center">
        <div
          className="pointer-events-none absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-center gap-4">
          <span
            className="brand-gradient glow-brand flex size-14 items-center justify-center rounded-2xl text-white"
            aria-hidden="true"
          >
            <Sparkles className="size-7" strokeWidth={2.25} />
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              {t("authors.studioEyebrow")}
            </span>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {t("authors.becomeAuthorTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("authors.becomeAuthorSubtitle")}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-2">
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.bio}>
                <FieldLabel htmlFor="apply-bio">{t("authors.bioLabel")}</FieldLabel>
                <Textarea
                  id="apply-bio"
                  rows={5}
                  aria-invalid={!!errors.bio}
                  placeholder={t("authors.bioPlaceholder")}
                  {...register("bio")}
                />
                <FieldError errors={[errors.bio]} />
              </Field>
              <Field data-invalid={!!errors.writingMotivation}>
                <FieldLabel htmlFor="apply-motivation">
                  {t("authors.motivationLabel")}
                </FieldLabel>
                <Textarea
                  id="apply-motivation"
                  rows={4}
                  aria-invalid={!!errors.writingMotivation}
                  placeholder={t("authors.motivationPlaceholder")}
                  {...register("writingMotivation")}
                />
                <FieldError errors={[errors.writingMotivation]} />
              </Field>
              <Field data-invalid={!!errors.writingInterests}>
                <FieldLabel htmlFor="apply-interests">{t("authors.interestsLabel")}</FieldLabel>
                <Textarea
                  id="apply-interests"
                  rows={4}
                  aria-invalid={!!errors.writingInterests}
                  placeholder={t("authors.interestsPlaceholder")}
                  {...register("writingInterests")}
                />
                <FieldDescription>{t("authors.applyHint")}</FieldDescription>
                <FieldError errors={[errors.writingInterests]} />
              </Field>
              <Button type="submit" className="glow-brand-hover w-fit" disabled={apply.isPending}>
                {t("authors.submitApplication")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
