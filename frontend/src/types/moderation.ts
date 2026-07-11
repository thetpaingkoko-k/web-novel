export type ReportTargetType = "chapter_comment" | "debate_post" | "book" | "user"
export type ReportStatus = "pending" | "reviewed" | "action_taken" | "dismissed"
export type ReportResolution = "action_taken" | "dismissed"

export interface ReportRequest {
  targetType: ReportTargetType
  targetId: number
  reason: string
}

/** Response of `POST /reports`. */
export interface ReportCreated {
  reportId: number
  targetType: ReportTargetType
  targetId: number
  status: ReportStatus
}

/** Body for `PUT /admin/reports/{id}/resolve`. */
export interface ResolveReportRequest {
  status: ReportStatus
  notes?: string
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
