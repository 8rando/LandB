import { supabase } from '../../lib/supabase'
import { Database } from '../../lib/supabase'

type BusinessSettings = Database['public']['Tables']['business_settings']['Row']
type BusinessSettingsInsert = Database['public']['Tables']['business_settings']['Insert']
type BusinessSettingsUpdate = Database['public']['Tables']['business_settings']['Update']

class SettingsService {
  async getBusinessSettings() {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return { data: data || null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createBusinessSettings(settings: BusinessSettingsInsert) {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .insert(settings)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateBusinessSettings(id: string, updates: BusinessSettingsUpdate) {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getOrCreateBusinessSettings(): Promise<{ data: BusinessSettings | null; error: Error | null }> {
    const { data: existing, error } = await this.getBusinessSettings()

    if (error) return { data: null, error }
    if (existing) return { data: existing, error: null }

    const defaultSettings: BusinessSettingsInsert = {
      business_name: 'L & B Limited',
      business_address: '',
      business_phone: '',
      business_email: '',
      business_tagline: 'Contractors Equipment & Supplies — Renting & Leasing',
      vat_rate: 17.00,
      low_stock_threshold: 5,
      sidebar_mode: 'expanded',
    }

    return this.createBusinessSettings(defaultSettings)
  }

  async updateVatRate(vatRate: number) {
    try {
      const { data: settings } = await this.getOrCreateBusinessSettings()
      if (!settings) throw new Error('Could not get business settings')

      return this.updateBusinessSettings(settings.id, { vat_rate: vatRate })
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateLowStockThreshold(threshold: number) {
    try {
      const { data: settings } = await this.getOrCreateBusinessSettings()
      if (!settings) throw new Error('Could not get business settings')

      return this.updateBusinessSettings(settings.id, { low_stock_threshold: threshold })
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateSidebarMode(mode: 'expanded' | 'hover') {
    try {
      const { data: settings } = await this.getOrCreateBusinessSettings()
      if (!settings) throw new Error('Could not get business settings')

      return this.updateBusinessSettings(settings.id, { sidebar_mode: mode })
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateBusinessInfo(info: {
    business_name?: string
    business_address?: string
    business_phone?: string
    business_email?: string
  }) {
    try {
      const { data: settings } = await this.getOrCreateBusinessSettings()
      if (!settings) throw new Error('Could not get business settings')

      return this.updateBusinessSettings(settings.id, info)
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async resetToDefaults() {
    try {
      const { data: settings } = await this.getOrCreateBusinessSettings()
      if (!settings) throw new Error('Could not get business settings')

      const defaultUpdates: BusinessSettingsUpdate = {
        business_name: 'L & B Limited',
        business_address: '',
        business_phone: '',
        business_email: '',
        vat_rate: 17.00,
        low_stock_threshold: 5,
        sidebar_mode: 'expanded',
      }

      return this.updateBusinessSettings(settings.id, defaultUpdates)
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}

export const settingsService = new SettingsService()