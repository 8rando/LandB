export type ItemType = 'Inventory' | 'Non-Inventory' | 'Service' | 'Bundle' | 'Other';

export type PaymentType = 'Cash' | 'Credit' | 'Debit' | 'Cheque';

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  itemType: ItemType;
  tags: string[];
  quantity: number;
  price: number;
  cost: number;
  minStock: number;
  unit: string;
  lastUpdated: string;
}

/** @deprecated use Product */
export type TireProduct = Product;

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paid: boolean;
  createdBy: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  paymentType: PaymentType;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface User {
  username: string;
  role: 'admin' | 'cashier';
  password: string;
}

export interface Settings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  vatRate: number;
  lowStockThreshold: number;
  sidebarMode: 'expanded' | 'hover';
}

export interface Activity {
  id: string;
  type: 'sale' | 'stock_update' | 'low_stock_alert' | 'invoice_deleted';
  description: string;
  timestamp: string;
  user?: string;
}
