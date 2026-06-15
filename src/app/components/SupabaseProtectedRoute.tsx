import { Navigate } from 'react-router'
import { useSupabaseAuth } from '../context/SupabaseAuthContext'
import { UserRole } from '../../services/supabase'
import { Loader2 } from 'lucide-react'

interface SupabaseProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function SupabaseProtectedRoute({ children, allowedRoles }: SupabaseProtectedRouteProps) {
  const { user, loading } = useSupabaseAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}