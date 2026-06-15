import { supabase } from '../../lib/supabase'
import { Database } from '../../lib/supabase'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

class ProductsService {
  async getAllProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getProductById(id: string) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createProduct(product: ProductInsert) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateProduct(id: string, updates: ProductUpdate) {
    try {
      const { data, error } = await supabase
        .from('products')
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

  async deleteProduct(id: string) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async updateStock(id: string, newQuantity: number) {
    return this.updateProduct(id, { quantity: newQuantity })
  }

  async getLowStockProducts(threshold: number = 5) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .lt('quantity', threshold)
        .eq('item_type', 'Inventory')

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async searchProducts(query: string) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%, description.ilike.%${query}%, sku.ilike.%${query}%`)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async bulkInsertProducts(products: ProductInsert[]) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(products)
        .select()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getProductsByCategory(itemType: string) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('item_type', itemType)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}

export const productsService = new ProductsService()