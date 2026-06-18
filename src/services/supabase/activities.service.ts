import { supabase } from '../../lib/supabase'
import { Database } from '../../lib/supabase'

type Activity = Database['public']['Tables']['activities']['Row']
type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type ActivityType = 'sale' | 'stock_update' | 'low_stock_alert' | 'invoice_deleted'

class ActivitiesService {
  async getAllActivities(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createActivity(activity: Omit<ActivityInsert, 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          ...activity,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async logSaleActivity(
    description: string,
    userId: string,
    metadata: {
      invoice_id: string
      customer_name: string
      total_amount: number
      items_count: number
    }
  ) {
    return this.createActivity({
      type: 'sale',
      description,
      user_id: userId,
      metadata
    })
  }

  async logStockUpdateActivity(
    description: string,
    userId: string,
    metadata: {
      product_id: string
      product_name: string
      old_quantity: number
      new_quantity: number
      change_type: 'manual' | 'sale' | 'restock'
    }
  ) {
    return this.createActivity({
      type: 'stock_update',
      description,
      user_id: userId,
      metadata
    })
  }

  async logLowStockAlert(
    description: string,
    metadata: {
      product_id: string
      product_name: string
      current_quantity: number
      min_stock: number
    }
  ) {
    return this.createActivity({
      type: 'low_stock_alert',
      description,
      user_id: null,
      metadata
    })
  }

  async getActivitiesByType(type: ActivityType, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getActivitiesByUser(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getActivitiesByDateRange(startDate: string, endDate: string, limit: number = 100) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async deleteOldActivities(daysOld: number = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { error } = await supabase
        .from('activities')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async getActivityCount() {
    try {
      const { count, error } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return { count: count || 0, error: null }
    } catch (error) {
      return { count: 0, error: error as Error }
    }
  }

  async getRecentSalesActivity(limit: number = 10) {
    return this.getActivitiesByType('sale', limit)
  }

  async getRecentStockUpdates(limit: number = 10) {
    return this.getActivitiesByType('stock_update', limit)
  }

  async getLowStockAlerts(limit: number = 10) {
    return this.getActivitiesByType('low_stock_alert', limit)
  }
}

export const activitiesService = new ActivitiesService()