import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type {
  Report,
  ReportCreated,
  ReportRequest,
  ReportStatus,
  ResolveReportRequest,
} from "@/types/moderation"

export const reportKeys = {
  queue: (status: ReportStatus) => ["admin", "reports", status] as const,
}

export function useFileReport() {
  return useMutation({
    mutationFn: async (payload: ReportRequest) => {
      const { data } = await apiClient.post<ReportCreated>("/reports", payload)
      return data
    },
  })
}

export function useReportQueue(status: ReportStatus = "pending") {
  return useQuery({
    queryKey: reportKeys.queue(status),
    queryFn: () => getList<Report>("/admin/reports", { params: { status } }),
  })
}

export function useResolveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ reportId, ...payload }: { reportId: number } & ResolveReportRequest) => {
      await apiClient.put(`/admin/reports/${reportId}/resolve`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
    },
  })
}
