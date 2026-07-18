/**
 * Client-supplied signals for the backend's DB-only view de-duplication (FR-5.1).
 * Shared by chapter and book view recording so both use the same session/device ids.
 */
const SESSION_ID_KEY = "webnovel_session_id"
const DEVICE_FP_KEY = "webnovel_device_fp"

export function getOrCreateSessionId() {
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

/**
 * A stable-per-device identifier for view de-duplication (FR-5.1). Persisted
 * separately from the session id so it survives new sessions on the same
 * device; the backend pairs it with session id for the 24h dedup window.
 */
export function getDeviceFingerprint() {
  let fp = localStorage.getItem(DEVICE_FP_KEY)
  if (!fp) {
    const seed = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}|${new Date().getTimezoneOffset()}`
    fp = `${btoa(seed).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}-${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem(DEVICE_FP_KEY, fp)
  }
  return fp
}
