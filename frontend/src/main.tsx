import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/features/auth/auth-context"
import "@/i18n"
import { queryClient } from "@/lib/query-client"
import { router } from "@/routes"
import "./index.css"

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  )
}

async function bootstrap() {
  // Dev-only in-browser mock backend. Enabled when VITE_ENABLE_MOCKS=true so
  // the SPA is fully clickable before a real backend exists.
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === "true") {
    const { startMockWorker } = await import("@/mocks/browser")
    await startMockWorker()
  }
  createRoot(document.getElementById("root")!).render(<App />)
}

void bootstrap()
