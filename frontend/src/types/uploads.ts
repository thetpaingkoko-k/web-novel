/**
 * Response from `POST /uploads/images` (multipart, field `file`).
 * `url` is relative to the backend root (e.g. `/uploads/images/<uuid>.png`),
 * NOT under `/api/v1`; use `resolveUploadUrl` to render it.
 */
export interface UploadImageResponse {
  url: string
  filename: string
}
