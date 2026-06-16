import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { authService, usersService, databaseService, settingsService, AuthUser, UserRole } from '../../services/supabase'

interface SupabaseAuthContextType {
  user: AuthUser | null
  loading: boolean
  session: Session | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  // User management (admin only)
  users: AuthUser[]
  createUser: (email: string, password: string, username: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>
  updateUserRole: (userId: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  refreshUsers: () => Promise<void>
  // Account lockout (maintain compatibility with existing UI)
  isLocked: boolean
  lockoutTime: number
  // Set when this device's session was superseded by a login elsewhere
  sessionConflict: boolean
  clearSessionConflict: () => void
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION = 60000
const SESSION_ID_KEY = 'lanims_active_session_id'

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [sessionConflict, setSessionConflict] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const currentSession = await authService.getSession()
        setSession(currentSession)

        if (currentSession?.user) {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSession()

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      setSession(session)

      if (session?.user) {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } else {
        setUser(null)
      }
    })

    const loadLockoutState = () => {
      const lockoutEnd = localStorage.getItem('lockoutEnd')
      if (lockoutEnd) {
        const endTime = parseInt(lockoutEnd)
        if (Date.now() < endTime) {
          setIsLocked(true)
          setLockoutTime(Math.ceil((endTime - Date.now()) / 1000))
        } else {
          localStorage.removeItem('lockoutEnd')
        }
      }
    }

    loadLockoutState()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Enforce a single active session per account: detect when another
  // device logs in (claiming a new session id) and sign this device out.
  useEffect(() => {
    if (!user) return

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const checkAndSubscribe = async () => {
      const localSessionId = localStorage.getItem(SESSION_ID_KEY)
      const { activeSessionId } = await authService.getActiveSessionId(user.id)

      if (cancelled) return

      if (localSessionId && activeSessionId && activeSessionId !== localSessionId) {
        await forceSignOut()
        return
      }

      unsubscribe = authService.subscribeToSessionChanges(user.id, (activeSessionId) => {
        const currentLocalId = localStorage.getItem(SESSION_ID_KEY)
        if (currentLocalId && activeSessionId !== currentLocalId) {
          forceSignOut()
        }
      })
    }

    checkAndSubscribe()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.role === 'admin') {
      refreshUsers()
    }
  }, [user])

  useEffect(() => {
    if (!isLocked) return
    const timer = setInterval(() => {
      const lockoutEnd = localStorage.getItem('lockoutEnd')
      if (lockoutEnd) {
        const remaining = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 1000)
        if (remaining <= 0) {
          setIsLocked(false)
          setLockoutTime(0)
          setFailedAttempts(0)
          localStorage.removeItem('lockoutEnd')
          clearInterval(timer)
        } else {
          setLockoutTime(remaining)
        }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isLocked])

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isLocked) {
      return { success: false, error: `Account locked. Try again in ${lockoutTime} seconds.` }
    }

    try {
      const { user: signedInUser, error } = await authService.signIn(email, password)

      if (error) {
        const next = failedAttempts + 1
        setFailedAttempts(next)

        if (next >= MAX_ATTEMPTS) {
          const end = Date.now() + LOCKOUT_DURATION
          localStorage.setItem('lockoutEnd', end.toString())
          setIsLocked(true)
          setLockoutTime(60)
          return { success: false, error: 'Too many failed attempts. Account locked for 1 minute.' }
        }

        return { success: false, error: error.message }
      }

      setFailedAttempts(0)
      setSessionConflict(false)

      // Claim this device as the sole active session, signing out
      // whichever device was previously logged into this account.
      if (signedInUser) {
        const sessionId = crypto.randomUUID()
        localStorage.setItem(SESSION_ID_KEY, sessionId)
        await authService.claimActiveSession(signedInUser.id, sessionId)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    username: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (username.trim().length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' }
      }
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }

      const { available } = await usersService.checkUsernameAvailability(username)
      if (!available) {
        return { success: false, error: 'Username already exists' }
      }

      // The first account ever registered becomes the administrator
      const { userCount } = await databaseService.getHealthStatus()
      const role: UserRole = userCount === 0 ? 'admin' : 'cashier'

      const { user: signedUpUser, error } = await authService.signUp(email, password, username, role)

      if (error) {
        return { success: false, error: error.message }
      }

      if (role === 'admin') {
        await settingsService.getOrCreateBusinessSettings()
      }

      if (signedUpUser) {
        const sessionId = crypto.randomUUID()
        localStorage.setItem(SESSION_ID_KEY, sessionId)
        await authService.claimActiveSession(signedUpUser.id, sessionId)
      }

      await refreshUsers()
      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    await authService.signOut()
    localStorage.removeItem(SESSION_ID_KEY)
    setUser(null)
    setSession(null)
    setUsers([])
  }

  // Same as signOut, but flags the conflict so the login screen can explain
  // why the user landed back there.
  const forceSignOut = async () => {
    await authService.signOut()
    localStorage.removeItem(SESSION_ID_KEY)
    setUser(null)
    setSession(null)
    setUsers([])
    setSessionConflict(true)
  }

  const clearSessionConflict = () => setSessionConflict(false)

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }

      const { error } = await authService.updatePassword(newPassword)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await authService.resetPassword(email)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const createUser = async (
    email: string,
    password: string,
    username: string,
    role: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Only administrators can create users' }
    }

    if (username.trim().length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' }
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }

    const { available } = await usersService.checkUsernameAvailability(username)
    if (!available) {
      return { success: false, error: 'Username already exists' }
    }

    const { error } = await authService.signUp(email, password, username, role)
    if (error) {
      return { success: false, error: error.message }
    }

    await refreshUsers()
    return { success: true }
  }

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Only administrators can delete users' }
    }
    if (user?.id === userId) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    try {
      const { error } = await authService.deleteUser(userId)

      if (error) {
        return { success: false, error: error.message }
      }

      await refreshUsers()
      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const updateUserRole = async (userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Only administrators can update user roles' }
    }

    try {
      const { error } = await usersService.updateUserRole(userId, role)

      if (error) {
        return { success: false, error: error.message }
      }

      await refreshUsers()
      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const refreshUsers = async () => {
    try {
      const { data, error } = await authService.getAllUsers()

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      const authUsers: AuthUser[] = data?.map(profile => ({
        id: profile.id,
        email: '',
        username: profile.username,
        role: profile.role
      })) || []

      setUsers(authUsers)
    } catch (error) {
      console.error('Error refreshing users:', error)
    }
  }

  const value: SupabaseAuthContextType = {
    user,
    loading,
    session,
    signIn,
    signUp,
    signOut,
    updatePassword,
    resetPassword,
    users,
    createUser,
    deleteUser,
    updateUserRole,
    refreshUsers,
    isLocked,
    lockoutTime,
    sessionConflict,
    clearSessionConflict,
  }

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext)
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider')
  }
  return context
}