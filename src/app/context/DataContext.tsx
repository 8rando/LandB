import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Invoice, Settings, Activity } from '../types';

interface DataContextType {
  products: Product[];
  invoices: Invoice[];
  settings: Settings;
  activities: Activity[];
  addProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  bulkImportProducts: (products: Omit<Product, 'id' | 'lastUpdated'>[]) => void;
  /** Update existing items by SKU match; insert any that have no match */
  upsertProducts: (products: Omit<Product, 'id' | 'lastUpdated'>[]) => { added: number; updated: number };
  addInvoice: (invoice: Omit<Invoice, 'id' | 'date'>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_SETTINGS: Settings = {
  businessName: 'L & B Limited',
  businessAddress: 'Cunningham Industrial Site Cayon',
  businessPhone: '869-465-9808',
  businessEmail: 'info@lb-limited.com',
  vatRate: 17,
  lowStockThreshold: 10,
  sidebarMode: 'expanded',
};

const DEMO_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Office Chair',
    description: 'Ergonomic adjustable office chair with lumbar support',
    sku: 'FRN-CHR-001',
    itemType: 'Inventory',
    tags: ['Furniture', 'Office'],
    quantity: 15,
    price: 249.99,
    cost: 140.00,
    minStock: 5,
    unit: 'each',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand',
    sku: 'TECH-STD-002',
    itemType: 'Inventory',
    tags: ['Electronics', 'Accessories'],
    quantity: 30,
    price: 59.99,
    cost: 28.00,
    minStock: 10,
    unit: 'each',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'IT Consultation',
    description: 'Hourly IT consulting and support services',
    sku: 'SVC-IT-001',
    itemType: 'Service',
    tags: ['Services', 'IT'],
    quantity: 0,
    price: 95.00,
    cost: 0,
    minStock: 0,
    unit: 'hour',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Printer Paper A4',
    description: '500 sheets, 80gsm white printer paper',
    sku: 'SUP-PPR-A4',
    itemType: 'Inventory',
    tags: ['Supplies', 'Office'],
    quantity: 7,
    price: 12.99,
    cost: 7.50,
    minStock: 20,
    unit: 'ream',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Software License',
    description: 'Annual productivity suite license key',
    sku: 'SFT-LIC-001',
    itemType: 'Non-Inventory',
    tags: ['Software', 'Digital'],
    quantity: 0,
    price: 199.00,
    cost: 120.00,
    minStock: 0,
    unit: 'license',
    lastUpdated: new Date().toISOString(),
  },
];

function migrateProducts(raw: any[]): Product[] {
  return raw.map((p: any) => {
    if (p.itemType) return p as Product;
    // Migrate old TireProduct shape
    return {
      id: p.id,
      name: `${p.brand ?? ''} ${p.model ?? ''}`.trim() || 'Unknown Item',
      description: [p.size, p.season].filter(Boolean).join(' • '),
      sku: p.sku ?? '',
      itemType: 'Inventory' as const,
      tags: p.season ? [p.season] : [],
      quantity: p.quantity ?? 0,
      price: p.price ?? 0,
      cost: p.cost ?? 0,
      minStock: p.minStock ?? 10,
      unit: 'each',
      lastUpdated: p.lastUpdated ?? new Date().toISOString(),
    };
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const storedProducts = localStorage.getItem('products');
    const storedInvoices = localStorage.getItem('invoices');
    const storedSettings = localStorage.getItem('settings');
    const storedActivities = localStorage.getItem('activities');

    try {
      const rawProducts = storedProducts ? JSON.parse(storedProducts) : null;
      setProducts(rawProducts ? migrateProducts(rawProducts) : DEMO_PRODUCTS);
    } catch {
      setProducts(DEMO_PRODUCTS);
    }

    setInvoices(storedInvoices ? JSON.parse(storedInvoices) : []);
    setSettings(storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS);
    setActivities(storedActivities ? JSON.parse(storedActivities) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const addProduct = (product: Omit<Product, 'id' | 'lastUpdated'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString(),
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p
      )
    );
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const bulkImportProducts = (newProducts: Omit<Product, 'id' | 'lastUpdated'>[]) => {
    const productsWithIds = newProducts.map(p => ({
      ...p,
      id: Date.now().toString() + Math.random(),
      lastUpdated: new Date().toISOString(),
    }));
    setProducts(prev => [...prev, ...productsWithIds]);
  };

  const upsertProducts = (incoming: Omit<Product, 'id' | 'lastUpdated'>[]): { added: number; updated: number } => {
    let added = 0;
    let updated = 0;
    const now = new Date().toISOString();

    setProducts(prev => {
      const result = [...prev];
      for (const p of incoming) {
        const existingIdx = p.sku
          ? result.findIndex(e => e.sku && e.sku === p.sku)
          : -1;

        if (existingIdx >= 0) {
          result[existingIdx] = { ...result[existingIdx], ...p, lastUpdated: now };
          updated++;
        } else {
          result.push({ ...p, id: Date.now().toString() + Math.random(), lastUpdated: now });
          added++;
        }
      }
      return result;
    });

    return { added, updated };
  };

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'date'>) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: `INV-${Date.now()}`,
      date: new Date().toISOString(),
    };
    setInvoices(prev => [newInvoice, ...prev]);

    // Only decrement quantity for inventory items
    invoice.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product && product.itemType === 'Inventory') {
        updateProduct(item.productId, {
          quantity: Math.max(0, product.quantity - item.quantity),
        });
      }
    });
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => (inv.id === id ? { ...inv, ...updates } : inv)));
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 50));
  };

  return (
    <DataContext.Provider
      value={{
        products,
        invoices,
        settings,
        activities,
        addProduct,
        updateProduct,
        deleteProduct,
        bulkImportProducts,
        upsertProducts,
        addInvoice,
        updateInvoice,
        updateSettings,
        addActivity,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
