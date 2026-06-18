import { createClient } from '@supabase/supabase-js'

// These fall back to the project's public values when build-time env vars
// are absent (e.g. a Cloudflare build without VITE_* set). The publishable
// (anon) key is designed to ship in the client bundle and is protected by
// RLS, so hardcoding it as a fallback is safe — it prevents the whole app
// from blanking out on a missing env var. Env vars still override these.
const FALLBACK_SUPABASE_URL = 'https://xjighysfyshcrqrwvgbg.supabase.co'
const FALLBACK_SUPABASE_KEY = 'sb_publishable_wAS-SmHmdsM_yXPGHQhGGA_cmgfi_Fg'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
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
          type: 'sale' | 'stock_update' | 'low_stock_alert' | 'invoice_deleted'
          description: string
          user_id: string | null
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          type: 'sale' | 'stock_update' | 'low_stock_alert' | 'invoice_deleted'
          description: string
          user_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'sale' | 'stock_update' | 'low_stock_alert' | 'invoice_deleted'
          description?: string
          user_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
      }
    }
  }
}