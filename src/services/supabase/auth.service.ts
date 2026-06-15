import { supabase } from '../../lib/supabase'
import { Database } from '../../lib/supabase'

export type UserRole = 'admin' | 'cashier'
export type AuthUser = {
  id: string
  email: string
  username: string
  role: UserRole
}

class AuthService {
  async signUp(email: string, password: string, username: string, role: UserRole = 'cashier') {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          username: username.toLowerCase().trim(),
          role,
        })

      if (profileError) {
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw profileError
      }

      return { user: authData.user, error: null }
    } catch (error) {
      return { user: null, error: error as Error }
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      return { user: null, session: null, error: error as Error }
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, role')
        .eq('id', user.id)
        .single()

      if (!profile) return null

      return {
        id: user.id,
        email: user.email || '',
        username: profile.username,
        role: profile.role,
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  }

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { error }
  }

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, role, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async deleteUser(userId: string) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }
}

export const authService = new AuthService()