import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/features/auth/auth-context"
import type { UserRole } from "@/types/auth"

type ProtectedRouteProps = { allowedRoles?: UserRole[] }

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}
