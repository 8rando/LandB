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
  async signUp(email: string, password: string, username: string, role: UserRole = 'cashier', captchaToken?: string) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
          // Stash the chosen username so it survives until the first confirmed
          // login, when the profile row is actually created. Role is decided
          // then (never trusted from the client) — see ensureUserProfile.
          data: { username: username.toLowerCase().trim() },
          // Return the email-confirmation link to the running app so
          // detectSessionInUrl can establish the session on click.
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // With "Confirm email" enabled, signUp returns no session. Defer profile
      // creation to the first confirmed login (ensureUserProfile), since an
      // unauthenticated insert would be blocked by RLS.
      if (!authData.session) {
        return { user: authData.user, needsEmailConfirmation: true, error: null }
      }

      // Confirmation disabled (autoconfirm): a session exists now, so create the
      // profile immediately, preserving the prior behaviour.
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          username: username.toLowerCase().trim(),
          role,
        })

      if (profileError) {
        throw profileError
      }

      return { user: authData.user, needsEmailConfirmation: false, error: null }
    } catch (error) {
      return { user: null, needsEmailConfirmation: false, error: error as Error }
    }
  }

  // Creates the current user's profile row if it doesn't exist yet. Called on
  // the first confirmed login (when a session finally exists). Role is computed
  // here — the very first profile becomes admin — never taken from the client.
  async ensureUserProfile(): Promise<{ created: boolean; role: UserRole | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { created: false, role: null, error: new Error('No authenticated user') }

      const { data: existing } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (existing) return { created: false, role: existing.role, error: null }

      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })

      const role: UserRole = (count ?? 0) === 0 ? 'admin' : 'cashier'
      const username = ((user.user_metadata?.username as string | undefined) || user.email?.split('@')[0] || 'user')
        .toLowerCase()
        .trim()

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, username, role })

      if (insertError) throw insertError

      return { created: true, role, error: null }
    } catch (error) {
      return { created: false, role: null, error: error as Error }
    }
  }

  async signIn(email: string, password: string, captchaToken?: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      })

      if (error) throw error

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      return { user: null, session: null, error: error as Error }
    }
  }

  // Stamps a new session id on the user's profile, superseding any session
  // already active on another device. Called once right after sign-in.
  async claimActiveSession(userId: string, sessionId: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ active_session_id: sessionId })
      .eq('id', userId)
    return { error }
  }

  async getActiveSessionId(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('active_session_id')
      .eq('id', userId)
      .single()
    if (error) return { activeSessionId: null, error }
    return { activeSessionId: data.active_session_id, error: null }
  }

  // Notifies the caller when another device claims the session (i.e. logs
  // in to the same account), so the current tab can be signed out.
  subscribeToSessionChanges(userId: string, onChange: (activeSessionId: string | null) => void) {
    const channel = supabase
      .channel(`user_profile_session_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${userId}` },
        (payload: any) => onChange(payload.new?.active_session_id ?? null)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

  async resetPassword(email: string, captchaToken?: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { captchaToken })
    return { error }
  }

  async resendConfirmation(email: string, captchaToken?: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        captchaToken,
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
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
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId)
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }
}

export const authService = new AuthService()
