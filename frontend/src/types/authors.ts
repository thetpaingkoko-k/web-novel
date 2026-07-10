export type CareerStage = "hobbyist" | "professional"

export interface AuthorProfile {
  authorId: number
  username: string
  bio: string | null
  careerStage: CareerStage
  isMonetizationEnabled: boolean
  monthlySubscriptionPrice: number | null
}
