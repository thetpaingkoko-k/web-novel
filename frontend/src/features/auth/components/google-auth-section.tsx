import { useCallback, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import axios from "axios"
import { useAuth } from "../auth-context"

/** Minimal typing for the Google Identity Services global we actually use. */
interface GoogleCredentialResponse {
  credential: string
}
interface GoogleIdApi {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client"

// Load the GIS script exactly once per page load, shared across mounts.
let gsiPromise: Promise<void> | null = null
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gsiPromise) return gsiPromise
  gsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      gsiPromise = null // allow a retry on a later mount
      reject(new Error("Failed to load Google Identity Services"))
    }
    document.head.appendChild(script)
  })
  return gsiPromise
}

// google.accounts.id.initialize() is a global singleton: calling it repeatedly
// makes GIS warn and keep only the last callback. So we run it once per page and
// route the credential through this shared ref, which always points at whichever
// section is currently mounted (login OR register).
let gsiInitialized = false
const activeCredentialHandler: {
  current: ((credential: string) => void) | null
} = { current: null }

interface GoogleAuthSectionProps {
  /** Called after tokens are stored — the page navigates the user onward. */
  onSuccess: () => void
}

/**
 * "Continue with Google" — renders Google's official one-tap-style button, sends
 * the returned ID token to the backend, and (on success) hands control back to
 * the page. Renders nothing when no client ID is configured, so email/password
 * stays the only path in that case. The divider + button appear together or not
 * at all.
 */
export function GoogleAuthSection({ onSuccess }: GoogleAuthSectionProps) {
  const { t } = useTranslation()
  const { googleLogin } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  const handleCredential = useCallback(
    (credential: string) => {
      googleLogin.mutate(
        { idToken: credential },
        {
          onSuccess,
          onError: (error) => {
            // Rule B: an email already registered with a password is rejected (409).
            const code = axios.isAxiosError(error)
              ? (error.response?.data as { code?: string } | undefined)?.code
              : undefined
            toast.error(
              code === "email_registered_with_password"
                ? t("auth.googleEmailRegistered")
                : t("auth.googleFailed")
            )
          },
        }
      )
    },
    [googleLogin, onSuccess, t]
  )

  // Keep the shared credential handler pointing at this mount's latest callback,
  // so the once-per-page initialize() below always routes to the live section.
  useEffect(() => {
    activeCredentialHandler.current = handleCredential
    return () => {
      if (activeCredentialHandler.current === handleCredential) {
        activeCredentialHandler.current = null
      }
    }
  }, [handleCredential])

  // Depends only on clientId: re-renders no longer re-run this (and thus can't
  // re-trigger initialize()). renderButton still runs on each mount.
  useEffect(() => {
    if (!clientId || !containerRef.current) return
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return
        if (!gsiInitialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) =>
              activeCredentialHandler.current?.(response.credential),
          })
          gsiInitialized = true
        }
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 300,
        })
      })
      .catch(() => {
        // Script blocked (offline/adblock): leave email+password as the only path.
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (!clientId) return null

  return (
    <div>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t border-border/70" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>
      {/* GIS injects its own button here; min-height avoids layout shift while it loads. */}
      <div ref={containerRef} className="flex min-h-[44px] justify-center" />
    </div>
  )
}
