import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requireGuest?: boolean
}

export function ProtectedRoute({ children, requireGuest = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-0 text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-1 border-t-transparent" />
          <p className="text-sm font-medium text-text-tertiary">Loading session...</p>
        </div>
      </div>
    )
  }

  if (requireGuest) {
    if (isAuthenticated) {
      return <Navigate to="/chat" replace />
    }
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
