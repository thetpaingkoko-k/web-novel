import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/features/auth/auth-context"
import { AmbientSoundProvider } from "@/features/chapters/ambient-sound"
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
            <AmbientSoundProvider>
              <RouterProvider router={router} />
              <Toaster />
            </AmbientSoundProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
