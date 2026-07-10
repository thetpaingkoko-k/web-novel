export type ReportTargetType = "chapter_comment" | "debate_post" | "book" | "user"
export type ReportStatus = "pending" | "reviewed" | "action_taken" | "dismissed"
export type ReportResolution = "action_taken" | "dismissed"

export interface ReportRequest {
  targetType: ReportTargetType
  targetId: number
  reason: string
}

export interface Report {
  reportId: number
  reporterId: number
  reporterUsername: string
  targetType: ReportTargetType
  targetId: number
  reason: string
  status: ReportStatus
  createdAt: string
  resolvedAt: string | null
}
