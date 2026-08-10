import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { tokenStorage } from "@/api/client"
import { AuthProvider } from "@/features/auth/auth-context"
import { GoogleAuthSection } from "@/features/auth/components/google-auth-section"
import "@/i18n"

type GoogleCallback = (response: { credential: string }) => void

function renderSection() {
  const onSuccess = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleAuthSection onSuccess={onSuccess} />
      </AuthProvider>
    </QueryClientProvider>
  )
  return { onSuccess }
}

/** Install a fake Google Identity Services global and capture the credential callback. */
function stubGoogleIdentity() {
  const state: { callback?: GoogleCallback } = {}
  Object.defineProperty(window, "google", {
    configurable: true,
    value: {
      accounts: {
        id: {
          initialize: ({ callback }: { callback: GoogleCallback }) => {
            state.callback = callback
          },
          renderButton: vi.fn(),
        },
      },
    },
  })
  return state
}

describe("GoogleAuthSection", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    tokenStorage.clearTokens()
    Reflect.deleteProperty(window, "google")
  })

  it("renders nothing when no client id is configured", () => {
    renderSection()
    expect(screen.queryByText(/continue with/i)).not.toBeInTheDocument()
  })

  it("exchanges the Google credential for tokens and calls onSuccess", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id")
    const gis = stubGoogleIdentity()

    const { onSuccess } = renderSection()

    expect(await screen.findByText(/continue with/i)).toBeInTheDocument()
    await waitFor(() => expect(gis.callback).toBeDefined())

    gis.callback!({ credential: "fake-id-token" })

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(tokenStorage.getAccessToken()).toBe("google-access-token")
  })
})
