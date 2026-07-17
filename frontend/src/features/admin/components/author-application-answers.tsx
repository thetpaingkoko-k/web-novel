import { useTranslation } from "react-i18next"

interface AuthorApplicationAnswersProps {
  bio: string | null
  writingMotivation: string | null
  writingInterests: string | null
}

/**
 * Renders an author applicant's onboarding answers (bio / motivation /
 * interests) so an admin can review them before approving. Renders nothing when
 * the user supplied no answers (plain readers, admins).
 */
export function AuthorApplicationAnswers({
  bio,
  writingMotivation,
  writingInterests,
}: AuthorApplicationAnswersProps) {
  const { t } = useTranslation()

  const answers: { label: string; value: string }[] = [
    { label: t("admin.application.aboutYou"), value: bio ?? "" },
    { label: t("admin.application.motivation"), value: writingMotivation ?? "" },
    { label: t("admin.application.interests"), value: writingInterests ?? "" },
  ].filter((a) => a.value.trim().length > 0)

  if (answers.length === 0) return null

  return (
    <dl className="mt-3 flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
      {answers.map((answer) => (
        <div key={answer.label} className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">{answer.label}</dt>
          <dd className="whitespace-pre-line text-foreground">{answer.value}</dd>
        </div>
      ))}
    </dl>
  )
}
