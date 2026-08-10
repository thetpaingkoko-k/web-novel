import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/features/auth/auth-context"
import type { UserRole } from "@/types/auth"

type ProtectedRouteProps = { allowedRoles?: UserRole[] }

/** Where a signed-in user belongs when they land on a route their role doesn't own. */
export function roleHome(role: UserRole): string {
  if (role === "admin") return "/admin"
  if (role === "hobbyist_author" || role === "professional_author") return "/author/books"
  return "/"
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  // Wrong role for this route → bounce to the user's own home, never another
  // role's page. Routes are owned by a single role (see routes/index.tsx).
  if (allowedRoles && user && !allowedRoles.includes(user.role))
    return <Navigate to={roleHome(user.role)} replace />

  return <Outlet />
}
