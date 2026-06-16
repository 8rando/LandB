import { supabase } from '../../lib/supabase'
import { Database } from '../../lib/supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

class UsersService {
  async getAllUserProfiles() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateUserProfile(userId: string, updates: UserProfileUpdate) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async deleteUserProfile(userId: string) {
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

  async getUsersByRole(role: 'admin' | 'cashier') {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', role)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async checkUsernameAvailability(username: string, excludeUserId?: string) {
    try {
      const { data, error } = await supabase.rpc('is_username_available', {
        p_username: username,
        p_exclude_id: excludeUserId || null,
      })

      if (error) throw error
      return { available: Boolean(data), error: null }
    } catch (error) {
      return { available: false, error: error as Error }
    }
  }

  async updateUserRole(userId: string, role: 'admin' | 'cashier') {
    return this.updateUserProfile(userId, { role })
  }

  async getUserCount() {
    try {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return { count: count || 0, error: null }
    } catch (error) {
      return { count: 0, error: error as Error }
    }
  }

  async searchUsers(query: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('username', `%${query}%`)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}

export const usersService = new UsersService()