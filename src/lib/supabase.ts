import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          sku: string | null
          item_type: 'Inventory' | 'Non-Inventory' | 'Service' | 'Bundle' | 'Other'
          tags: string[]
          quantity: number
          price: number
          cost: number
          min_stock: number
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sku?: string | null
          item_type?: 'Inventory' | 'Non-Inventory' | 'Service' | 'Bundle' | 'Other'
          tags?: string[]
          quantity?: number
          price?: number
          cost?: number
          min_stock?: number
          unit?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sku?: string | null
          item_type?: 'Inventory' | 'Non-Inventory' | 'Service' | 'Bundle' | 'Other'
          tags?: string[]
          quantity?: number
          price?: number
          cost?: number
          min_stock?: number
          unit?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          username: string
          role: 'admin' | 'cashier'
          active_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          role?: 'admin' | 'cashier'
          active_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          role?: 'admin' | 'cashier'
          active_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          customer_name: string
          customer_address: string | null
          customer_phone: string | null
          subtotal: number
          discount: number
          vat_rate: number
          vat_amount: number
          total: number
          paid: boolean
          payment_type: 'Cash' | 'Credit' | 'Debit' | 'Cheque'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          customer_name: string
          customer_address?: string | null
          customer_phone?: string | null
          subtotal?: number
          discount?: number
          vat_rate?: number
          vat_amount?: number
          total?: number
          paid?: boolean
          payment_type?: 'Cash' | 'Credit' | 'Debit' | 'Cheque'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          customer_name?: string
          customer_address?: string | null
          customer_phone?: string | null
          subtotal?: number
          discount?: number
          vat_rate?: number
          vat_amount?: number
          total?: number
          paid?: boolean
          payment_type?: 'Cash' | 'Credit' | 'Debit' | 'Cheque'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string
          product_name: string
          quantity: number
          price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          product_id: string
          product_name: string
          quantity: number
          price: number
          total: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          price?: number
          total?: number
          created_at?: string
        }
      }
      business_settings: {
        Row: {
          id: string
          business_name: string
          business_address: string
          business_phone: string
          business_email: string
          vat_rate: number
          low_stock_threshold: number
          sidebar_mode: 'expanded' | 'hover'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name?: string
          business_address?: string
          business_phone?: string
          business_email?: string
          vat_rate?: number
          low_stock_threshold?: number
          sidebar_mode?: 'expanded' | 'hover'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          business_address?: string
          business_phone?: string
          business_email?: string
          vat_rate?: number
          low_stock_threshold?: number
          sidebar_mode?: 'expanded' | 'hover'
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          type: 'sale' | 'stock_update' | 'low_stock_alert'
          description: string
          user_id: string | null
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          type: 'sale' | 'stock_update' | 'low_stock_alert'
          description: string
          user_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'sale' | 'stock_update' | 'low_stock_alert'
          description?: string
          user_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
      }
    }
  }
}