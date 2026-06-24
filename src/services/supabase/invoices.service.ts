import { supabase } from '../../lib/supabase'
import { Database } from '../../lib/supabase'

type Invoice = Database['public']['Tables']['invoices']['Row']
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']

export interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[]
  created_by_profile: { username: string } | null
}

class InvoicesService {
  async getAllInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*),
          created_by_profile:user_profiles!invoices_created_by_fkey (username)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as InvoiceWithItems[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getInvoiceById(id: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return { data: data as InvoiceWithItems, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createInvoice(invoice: InvoiceInsert, items: Omit<InvoiceItemInsert, 'invoice_id'>[]) {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .single()

      if (invoiceError) throw invoiceError

      const invoiceItems = items.map(item => ({
        ...item,
        invoice_id: invoiceData.id
      }))

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)
        .select()

      if (itemsError) throw itemsError

      for (const item of items) {
        const { error: stockError } = await supabase.rpc('update_product_stock', {
          product_id: item.product_id,
          quantity_change: -item.quantity
        })
        if (stockError) console.warn('Failed to update stock:', stockError)
      }

      return {
        data: { ...invoiceData, invoice_items: itemsData },
        error: null
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateInvoice(id: string, updates: Partial<Invoice>) {
    try {
      const { data, error } = await supabase
        .from('invoices')
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

  async markInvoiceAsPaid(id: string) {
    return this.updateInvoice(id, { paid: true })
  }

  async deleteInvoice(id: string) {
    try {
      // .select() returns the rows actually deleted. Under RLS, a denied
      // delete returns success with an empty array rather than an error, so
      // the caller inspects `data.length` to tell "deleted" from "blocked".
      const { data, error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .select('id')

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getInvoicesByDateRange(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as InvoiceWithItems[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUnpaidInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('paid', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as InvoiceWithItems[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  // Produces a human-readable, date-based number: "dd.mm.yyyy-N" where N is the
  // running count of invoices for that day (1, 2, 3 …). The day's sequence is
  // derived from existing numbers sharing the same date prefix, so it stays
  // consistent with the date shown on the invoice regardless of timezone.
  async generateInvoiceNumber(): Promise<string> {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const datePart = `${dd}.${mm}.${yyyy}`

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${datePart}-%`)

      if (error) throw error

      let maxSeq = 0
      for (const row of data || []) {
        const seq = parseInt((row.invoice_number || '').split('-')[1] || '0', 10)
        if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq
      }

      return `${datePart}-${maxSeq + 1}`
    } catch (error) {
      // Fallback keeps the date-based shape but appends a time-based suffix to
      // stay unique if the lookup fails.
      return `${datePart}-${Date.now().toString().slice(-4)}`
    }
  }

  async getTotalSales(startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('invoices')
        .select('total')
        .eq('paid', true)

      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)

      const { data, error } = await query

      if (error) throw error

      const total = data?.reduce((sum, invoice) => sum + Number(invoice.total), 0) || 0
      return { data: total, error: null }
    } catch (error) {
      return { data: 0, error: error as Error }
    }
  }
}

export const invoicesService = new InvoicesService()