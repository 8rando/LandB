import { supabase } from '../../lib/supabase'

class DatabaseService {
  async testConnection() {
    try {
      const { error } = await supabase
        .from('products')
        .select('count')
        .limit(1)

      if (error) throw error
      return { connected: true, error: null }
    } catch (error) {
      return { connected: false, error: error as Error }
    }
  }

  async getHealthStatus() {
    try {
      const { data, error } = await supabase.rpc('get_app_health')
      if (error) throw error
      return {
        connected: true,
        userCount: data?.user_count || 0,
        productCount: data?.product_count || 0,
        invoiceCount: data?.invoice_count || 0,
        error: null
      }
    } catch (error) {
      return {
        connected: false,
        userCount: 0,
        productCount: 0,
        invoiceCount: 0,
        error: error as Error
      }
    }
  }

  async clearAllData() {
    try {
      await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      console.log('All data cleared successfully')
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error as Error }
    }
  }
}

export const databaseService = new DatabaseService()