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
  /**
   * The reported content itself so the admin can act without hunting: an
   * ellipsized comment/debate excerpt, a book title, or the reported user's
   * username. Null when the target was deleted.
   */
  targetContent: string | null
  /** Author/owner of the reported content; null for user reports or deleted targets. */
  targetAuthorId: number | null
  targetAuthorUsername: string | null
  reason: string
  status: ReportStatus
  createdAt: string
  resolvedAt: string | null
}
