import { supabase } from '../../lib/supabase'
import { authService } from './auth.service'
import { settingsService } from './settings.service'

class DatabaseService {
  async testConnection() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('count')
        .limit(1)

      if (error) throw error
      return { connected: true, error: null }
    } catch (error) {
      return { connected: false, error: error as Error }
    }
  }

  async initializeDatabase() {
    try {
      await this.createDefaultAdminUser()
      await this.initializeBusinessSettings()
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error as Error }
    }
  }

  private async createDefaultAdminUser() {
    try {
      const adminEmail = 'admin@lanims.com'
      const adminPassword = 'admin123'
      const adminUsername = 'admin'

      const existingAdmin = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', adminUsername)
        .single()

      if (existingAdmin.data) {
        console.log('Default admin user already exists')
        return
      }

      const { user, error } = await authService.signUp(
        adminEmail,
        adminPassword,
        adminUsername,
        'admin'
      )

      if (error) throw error
      console.log('Default admin user created successfully')
    } catch (error) {
      console.error('Error creating default admin user:', error)
      throw error
    }
  }

  private async initializeBusinessSettings() {
    try {
      const { data } = await settingsService.getBusinessSettings()
      if (data) {
        console.log('Business settings already exist')
        return
      }

      const { error } = await settingsService.getOrCreateBusinessSettings()
      if (error) throw error
      console.log('Default business settings created successfully')
    } catch (error) {
      console.error('Error initializing business settings:', error)
      throw error
    }
  }

  async seedSampleData() {
    try {
      await this.createSampleProducts()
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error as Error }
    }
  }

  private async createSampleProducts() {
    try {
      const { data: existingProducts } = await supabase
        .from('products')
        .select('count')

      if (existingProducts && existingProducts.length > 0) {
        console.log('Sample products already exist')
        return
      }

      const sampleProducts = [
        {
          name: 'Office Chair - Ergonomic',
          description: 'Comfortable ergonomic office chair with lumbar support',
          sku: 'OFC-001',
          item_type: 'Inventory' as const,
          tags: ['furniture', 'office'],
          quantity: 15,
          price: 350.00,
          cost: 200.00,
          min_stock: 5,
          unit: 'each'
        },
        {
          name: 'Laptop Stand - Aluminum',
          description: 'Adjustable aluminum laptop stand for better ergonomics',
          sku: 'LPS-002',
          item_type: 'Inventory' as const,
          tags: ['electronics', 'accessories'],
          quantity: 25,
          price: 89.99,
          cost: 45.00,
          min_stock: 10,
          unit: 'each'
        },
        {
          name: 'Consulting Service',
          description: 'Professional IT consulting service per hour',
          sku: 'SRV-001',
          item_type: 'Service' as const,
          tags: ['service', 'consulting'],
          quantity: 0,
          price: 150.00,
          cost: 75.00,
          min_stock: 0,
          unit: 'hour'
        },
        {
          name: 'Software License - Annual',
          description: 'Annual software license for productivity suite',
          sku: 'LIC-001',
          item_type: 'Non-Inventory' as const,
          tags: ['software', 'license'],
          quantity: 0,
          price: 299.99,
          cost: 180.00,
          min_stock: 0,
          unit: 'license'
        },
        {
          name: 'USB Cable - Type C',
          description: '2m USB Type-C cable for fast charging',
          sku: 'CBL-001',
          item_type: 'Inventory' as const,
          tags: ['electronics', 'cables'],
          quantity: 3,
          price: 25.99,
          cost: 12.50,
          min_stock: 5,
          unit: 'each'
        }
      ]

      const { error } = await supabase
        .from('products')
        .insert(sampleProducts)

      if (error) throw error
      console.log('Sample products created successfully')
    } catch (error) {
      console.error('Error creating sample products:', error)
      throw error
    }
  }

  async getHealthStatus() {
    try {
      const connectionTest = await this.testConnection()

      const { data: userCount } = await supabase
        .from('user_profiles')
        .select('count')

      const { data: productCount } = await supabase
        .from('products')
        .select('count')

      const { data: invoiceCount } = await supabase
        .from('invoices')
        .select('count')

      return {
        connected: connectionTest.connected,
        userCount: userCount?.length || 0,
        productCount: productCount?.length || 0,
        invoiceCount: invoiceCount?.length || 0,
        error: connectionTest.error
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