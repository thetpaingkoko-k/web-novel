import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { UploadImageResponse } from "@/types/uploads"

/** Content types the backend accepts for image uploads (mirrors the contract). */
export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif"

/**
 * Backend root (without the `/api/v1` prefix) that serves `/uploads/**`.
 *
 * Stripping the `/api/v1` suffix from a relative base (e.g. `/api/v1`) yields an
 * empty string — correct for a same-origin proxied prod deploy, but wrong in dev
 * where the API lives on a different port (8080) than the Vite host (5173): an
 * empty origin makes `<img src="/uploads/...">` resolve against 5173 and 404.
 * So in dev only, fall back to the backend dev host instead of same-origin.
 */
const BACKEND_ORIGIN = (() => {
  const origin = (
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1"
  ).replace(/\/api\/v1\/?$/, "")
  if (origin === "" && import.meta.env.DEV) return "http://localhost:8080"
  return origin
})()

/**
 * Turn a stored upload path into something an `<img src>` can load.
 *
 * Uploaded files come back as backend-root-relative paths (`/uploads/...`),
 * which the SPA's own dev/prod origin does not serve. Prefix those with the
 * backend origin. Any other value (an absolute URL from before this feature, or
 * an empty string) is returned unchanged so existing data keeps working.
 */
export function resolveUploadUrl(url: string): string {
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`
  return url
}

/**
 * Upload a single image file as `multipart/form-data` (field `file`).
 *
 * We hand axios a `FormData` body and let it set the `Content-Type` including
 * the multipart boundary — setting the header ourselves would omit the boundary
 * and the request would be unparseable server-side.
 */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await apiClient.post<UploadImageResponse>("/uploads/images", formData)
      return data
    },
  })
}
