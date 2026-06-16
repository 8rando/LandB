import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  productsService,
  invoicesService,
  settingsService,
  activitiesService,
  InvoiceWithItems,
  authService
} from '../../services/supabase'
import { Product, Invoice, Settings, Activity } from '../types'
import { Database } from '../../lib/supabase'

type SupabaseProduct = Database['public']['Tables']['products']['Row']
type SupabaseInvoice = Database['public']['Tables']['invoices']['Row']
type SupabaseSettings = Database['public']['Tables']['business_settings']['Row']
type SupabaseActivity = Database['public']['Tables']['activities']['Row']

interface SupabaseDataContextType {
  products: Product[]
  invoices: Invoice[]
  settings: Settings
  activities: Activity[]
  loading: boolean
  error: string | null
  // Product operations
  addProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => Promise<{ success: boolean; error?: string }>
  updateProduct: (id: string, product: Partial<Product>) => Promise<{ success: boolean; error?: string }>
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>
  bulkImportProducts: (products: Omit<Product, 'id' | 'lastUpdated'>[]) => Promise<{ success: boolean; error?: string; added: number }>
  upsertProducts: (products: Omit<Product, 'id' | 'lastUpdated'>[]) => Promise<{ added: number; updated: number; error?: string }>
  // Invoice operations
  addInvoice: (invoice: Omit<Invoice, 'id' | 'date' | 'invoiceNumber'>) => Promise<{ success: boolean; error?: string; invoiceId?: string }>
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<{ success: boolean; error?: string }>
  // Settings operations
  updateSettings: (settings: Partial<Settings>) => Promise<{ success: boolean; error?: string }>
  // Activity operations
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<{ success: boolean; error?: string }>
  // Refresh operations
  refreshData: () => Promise<void>
  refreshProducts: () => Promise<void>
  refreshInvoices: () => Promise<void>
  refreshActivities: () => Promise<void>
}

const SupabaseDataContext = createContext<SupabaseDataContextType | undefined>(undefined)

// Transform functions to convert between Supabase and app types
const transformSupabaseProduct = (supabaseProduct: SupabaseProduct): Product => ({
  id: supabaseProduct.id,
  name: supabaseProduct.name,
  description: supabaseProduct.description || '',
  sku: supabaseProduct.sku || '',
  itemType: supabaseProduct.item_type as Product['itemType'],
  tags: supabaseProduct.tags || [],
  quantity: supabaseProduct.quantity,
  price: Number(supabaseProduct.price),
  cost: Number(supabaseProduct.cost),
  minStock: supabaseProduct.min_stock,
  unit: supabaseProduct.unit,
  lastUpdated: supabaseProduct.updated_at,
})

const transformSupabaseInvoice = (supabaseInvoice: InvoiceWithItems): Invoice => ({
  id: supabaseInvoice.id,
  invoiceNumber: supabaseInvoice.invoice_number,
  createdBy: supabaseInvoice.created_by_profile?.username || 'Unknown',
  customerName: supabaseInvoice.customer_name,
  customerAddress: supabaseInvoice.customer_address || '',
  customerPhone: supabaseInvoice.customer_phone || '',
  items: supabaseInvoice.invoice_items.map(item => ({
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    price: Number(item.price),
    total: Number(item.total),
  })),
  subtotal: Number(supabaseInvoice.subtotal),
  discount: Number(supabaseInvoice.discount),
  vatRate: Number(supabaseInvoice.vat_rate),
  vatAmount: Number(supabaseInvoice.vat_amount),
  total: Number(supabaseInvoice.total),
  paid: supabaseInvoice.paid,
  paymentType: supabaseInvoice.payment_type as Invoice['paymentType'],
  date: supabaseInvoice.created_at,
})

const transformSupabaseSettings = (supabaseSettings: SupabaseSettings): Settings => ({
  businessName: supabaseSettings.business_name,
  businessAddress: supabaseSettings.business_address,
  businessPhone: supabaseSettings.business_phone,
  businessEmail: supabaseSettings.business_email,
  vatRate: Number(supabaseSettings.vat_rate),
  lowStockThreshold: supabaseSettings.low_stock_threshold,
  sidebarMode: supabaseSettings.sidebar_mode,
})

const transformSupabaseActivity = (supabaseActivity: SupabaseActivity): Activity => ({
  id: supabaseActivity.id,
  type: supabaseActivity.type,
  description: supabaseActivity.description,
  user: 'System', // We'll need to join this properly
  timestamp: supabaseActivity.created_at,
})

// Transform app types to Supabase insert types
const transformProductToSupabase = (product: Omit<Product, 'id' | 'lastUpdated'>) => ({
  name: product.name,
  description: product.description || null,
  sku: product.sku || null,
  item_type: product.itemType as Database['public']['Tables']['products']['Insert']['item_type'],
  tags: product.tags,
  quantity: product.quantity,
  price: product.price,
  cost: product.cost,
  min_stock: product.minStock,
  unit: product.unit,
})

export function SupabaseDataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [settings, setSettings] = useState<Settings>({
    businessName: 'L & B Limited',
    businessAddress: 'Cunningham Industrial Site Cayon',
    businessPhone: '869-465-9808',
    businessEmail: 'info@lb-limited.com',
    vatRate: 17,
    lowStockThreshold: 10,
    sidebarMode: 'expanded',
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all data on mount
  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        refreshProducts(),
        refreshInvoices(),
        refreshSettings(),
        refreshActivities(),
      ])
    } catch (err) {
      setError('Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshProducts = async () => {
    try {
      const { data, error } = await productsService.getAllProducts()
      if (error) throw error
      setProducts(data ? data.map(transformSupabaseProduct) : [])
    } catch (err) {
      console.error('Error loading products:', err)
    }
  }

  const refreshInvoices = async () => {
    try {
      const { data, error } = await invoicesService.getAllInvoices()
      if (error) throw error
      setInvoices(data ? data.map(transformSupabaseInvoice) : [])
    } catch (err) {
      console.error('Error loading invoices:', err)
    }
  }

  const refreshSettings = async () => {
    try {
      const { data, error } = await settingsService.getOrCreateBusinessSettings()
      if (error) throw error
      if (data) {
        setSettings(transformSupabaseSettings(data))
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    }
  }

  const refreshActivities = async () => {
    try {
      const { data, error } = await activitiesService.getAllActivities(50)
      if (error) throw error
      setActivities(data ? data.map(transformSupabaseActivity) : [])
    } catch (err) {
      console.error('Error loading activities:', err)
    }
  }

  const addProduct = async (product: Omit<Product, 'id' | 'lastUpdated'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseProduct = transformProductToSupabase(product)
      const { data, error } = await productsService.createProduct(supabaseProduct)

      if (error) throw error
      if (data) {
        setProducts(prev => [...prev, transformSupabaseProduct(data)])
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to add product' }
    }
  }

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseUpdates: any = {}
      if (updates.name) supabaseUpdates.name = updates.name
      if (updates.description !== undefined) supabaseUpdates.description = updates.description || null
      if (updates.sku !== undefined) supabaseUpdates.sku = updates.sku || null
      if (updates.itemType) supabaseUpdates.item_type = updates.itemType
      if (updates.tags) supabaseUpdates.tags = updates.tags
      if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity
      if (updates.price !== undefined) supabaseUpdates.price = updates.price
      if (updates.cost !== undefined) supabaseUpdates.cost = updates.cost
      if (updates.minStock !== undefined) supabaseUpdates.min_stock = updates.minStock
      if (updates.unit) supabaseUpdates.unit = updates.unit

      const { data, error } = await productsService.updateProduct(id, supabaseUpdates)

      if (error) throw error
      if (data) {
        setProducts(prev => prev.map(p => p.id === id ? transformSupabaseProduct(data) : p))
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update product' }
    }
  }

  const deleteProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await productsService.deleteProduct(id)

      if (error) throw error
      setProducts(prev => prev.filter(p => p.id !== id))

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete product' }
    }
  }

  const bulkImportProducts = async (productsToImport: Omit<Product, 'id' | 'lastUpdated'>[]): Promise<{ success: boolean; error?: string; added: number }> => {
    try {
      const supabaseProducts = productsToImport.map(transformProductToSupabase)
      const { data, error } = await productsService.bulkInsertProducts(supabaseProducts)

      if (error) throw error

      await refreshProducts() // Refresh to get all products with proper IDs

      return { success: true, added: data?.length || 0 }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to import products', added: 0 }
    }
  }

  const upsertProducts = async (productsToUpsert: Omit<Product, 'id' | 'lastUpdated'>[]): Promise<{ added: number; updated: number; error?: string }> => {
    let added = 0
    let updated = 0

    try {
      for (const product of productsToUpsert) {
        const existing = products.find(p => p.sku === product.sku)

        if (existing) {
          const result = await updateProduct(existing.id, product)
          if (result.success) updated++
        } else {
          const result = await addProduct(product)
          if (result.success) added++
        }
      }

      return { added, updated }
    } catch (err: any) {
      return { added, updated, error: err.message || 'Failed to upsert products' }
    }
  }

  const addInvoice = async (invoice: Omit<Invoice, 'id' | 'date' | 'invoiceNumber'>): Promise<{ success: boolean; error?: string; invoiceId?: string }> => {
    try {
      const currentUser = await authService.getCurrentUser()
      const invoiceNumber = await invoicesService.generateInvoiceNumber()

      const supabaseInvoice = {
        invoice_number: invoiceNumber,
        customer_name: invoice.customerName,
        customer_address: invoice.customerAddress || null,
        customer_phone: invoice.customerPhone || null,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        vat_rate: invoice.vatRate,
        vat_amount: invoice.vatAmount,
        total: invoice.total,
        paid: invoice.paid,
        payment_type: invoice.paymentType as Database['public']['Tables']['invoices']['Insert']['payment_type'],
        created_by: currentUser?.id || null,
      }

      const supabaseItems = invoice.items.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      }))

      const { data, error } = await invoicesService.createInvoice(supabaseInvoice, supabaseItems)

      if (error) throw error

      await refreshInvoices()
      await refreshProducts() // Refresh products to update stock levels

      return { success: true, invoiceId: data?.id }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create invoice' }
    }
  }

  const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseUpdates: any = {}
      if (updates.customerName) supabaseUpdates.customer_name = updates.customerName
      if (updates.customerAddress !== undefined) supabaseUpdates.customer_address = updates.customerAddress || null
      if (updates.customerPhone !== undefined) supabaseUpdates.customer_phone = updates.customerPhone || null
      if (updates.subtotal !== undefined) supabaseUpdates.subtotal = updates.subtotal
      if (updates.discount !== undefined) supabaseUpdates.discount = updates.discount
      if (updates.vatRate !== undefined) supabaseUpdates.vat_rate = updates.vatRate
      if (updates.vatAmount !== undefined) supabaseUpdates.vat_amount = updates.vatAmount
      if (updates.total !== undefined) supabaseUpdates.total = updates.total
      if (updates.paid !== undefined) supabaseUpdates.paid = updates.paid
      if (updates.paymentType) supabaseUpdates.payment_type = updates.paymentType

      const { data, error } = await invoicesService.updateInvoice(id, supabaseUpdates)

      if (error) throw error

      await refreshInvoices()

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update invoice' }
    }
  }

  const updateSettings = async (updates: Partial<Settings>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: currentSettings } = await settingsService.getOrCreateBusinessSettings()
      if (!currentSettings) throw new Error('Could not load current settings')

      const supabaseUpdates: any = {}
      if (updates.businessName) supabaseUpdates.business_name = updates.businessName
      if (updates.businessAddress !== undefined) supabaseUpdates.business_address = updates.businessAddress
      if (updates.businessPhone !== undefined) supabaseUpdates.business_phone = updates.businessPhone
      if (updates.businessEmail !== undefined) supabaseUpdates.business_email = updates.businessEmail
      if (updates.vatRate !== undefined) supabaseUpdates.vat_rate = updates.vatRate
      if (updates.lowStockThreshold !== undefined) supabaseUpdates.low_stock_threshold = updates.lowStockThreshold
      if (updates.sidebarMode) supabaseUpdates.sidebar_mode = updates.sidebarMode

      const { data, error } = await settingsService.updateBusinessSettings(currentSettings.id, supabaseUpdates)

      if (error) throw error
      if (data) {
        setSettings(transformSupabaseSettings(data))
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update settings' }
    }
  }

  const addActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUser = await authService.getCurrentUser()

      const { data, error } = await activitiesService.createActivity({
        type: activity.type as 'sale' | 'stock_update' | 'low_stock_alert',
        description: activity.description,
        user_id: currentUser?.id || null,
        metadata: {},
      })

      if (error) throw error

      await refreshActivities()

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to add activity' }
    }
  }

  const value: SupabaseDataContextType = {
    products,
    invoices,
    settings,
    activities,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkImportProducts,
    upsertProducts,
    addInvoice,
    updateInvoice,
    updateSettings,
    addActivity,
    refreshData,
    refreshProducts,
    refreshInvoices,
    refreshActivities,
  }

  return (
    <SupabaseDataContext.Provider value={value}>
      {children}
    </SupabaseDataContext.Provider>
  )
}

export function useSupabaseData() {
  const context = useContext(SupabaseDataContext)
  if (!context) {
    throw new Error('useSupabaseData must be used within SupabaseDataProvider')
  }
  return context
}