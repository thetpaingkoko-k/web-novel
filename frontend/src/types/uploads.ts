/**
 * Response from `POST /uploads/images` (multipart, field `file`).
 * `url` is relative to the backend root (e.g. `/uploads/images/<uuid>.png`),
 * NOT under `/api/v1`; use `resolveUploadUrl` to render it.
 */
export interface UploadImageResponse {
  url: string
  filename: string
}

/**
 * Response from `POST /uploads/audio` (multipart, field `file`).
 * `url` is relative to the backend root (e.g. `/uploads/audio/<uuid>.mp3`),
 * NOT under `/api/v1`; use `resolveUploadUrl` to render it in an `<audio>`.
 */
export interface UploadAudioResponse {
  url: string
  filename: string
}
