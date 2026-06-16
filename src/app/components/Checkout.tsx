import { useState, useMemo, useRef } from 'react';
import { useSupabaseData } from '../context/SupabaseDataContext';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Plus, Minus, Trash2, ShoppingCart, Tag, Pencil, Check, User } from 'lucide-react';
import { InvoiceItem, ItemType, PaymentType } from '../types';
import { toast } from 'sonner';

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  Inventory: 'bg-blue-100 text-blue-700',
  'Non-Inventory': 'bg-slate-100 text-slate-700',
  Service: 'bg-green-100 text-green-700',
  Bundle: 'bg-orange-100 text-orange-800',
  Other: 'bg-gray-100 text-gray-600',
};

interface CartItem extends InvoiceItem {
  defaultPrice: number;
  priceOverridden: boolean;
}

export function Checkout() {
  const { products, settings, addInvoice, addActivity } = useSupabaseData();
  const { user } = useSupabaseAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
  const [filterTag, setFilterTag] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const priceInputRef = useRef<HTMLInputElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    products.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (filterType !== 'all') filtered = filtered.filter(p => p.itemType === filterType);
    if (filterTag) filtered = filtered.filter(p => p.tags?.includes(filterTag));
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.tags?.some(t => t.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [products, searchTerm, filterType, filterTag]);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const isInventory = product.itemType === 'Inventory';
    if (isInventory && product.quantity <= 0) {
      toast.error('Product out of stock');
      return;
    }

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
      if (isInventory && existing.quantity >= product.quantity) {
        toast.error('Not enough stock available');
        return;
      }
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1, total: item.price * (item.quantity + 1) }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        defaultPrice: product.price,
        priceOverridden: false,
        total: product.price,
      }]);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (product.itemType === 'Inventory' && newQty > product.quantity) {
      toast.error('Not enough stock available');
      return;
    }
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQty, total: item.price * newQty }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // ── Custom price editing ─────────────────────────────────────────────────
  const startEditPrice = (item: CartItem) => {
    setEditingPriceId(item.productId);
    setEditingPriceValue(item.price.toFixed(2));
    setTimeout(() => priceInputRef.current?.select(), 30);
  };

  const commitPrice = (productId: string) => {
    const newPrice = parseFloat(editingPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      const product = products.find(p => p.id === productId);
      const defaultPrice = product?.price ?? 0;
      setCart(cart.map(item =>
        item.productId === productId
          ? {
              ...item,
              price: newPrice,
              total: newPrice * item.quantity,
              priceOverridden: newPrice !== defaultPrice,
            }
          : item
      ));
    }
    setEditingPriceId(null);
  };

  const resetPrice = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, price: product.price, total: product.price * item.quantity, priceOverridden: false }
        : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = (afterDiscount * settings.vatRate) / 100;
  const total = afterDiscount + vatAmount;

  const handleCheckout = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (!customerName.trim()) { toast.error('Please enter a customer name'); return; }

    addInvoice({
      items: cart.map(({ defaultPrice: _d, priceOverridden: _p, ...item }) => item),
      subtotal,
      discount,
      vatRate: settings.vatRate,
      vatAmount,
      total,
      paid: false,
      createdBy: user?.username || 'Unknown',
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      paymentType,
    });

    addActivity({
      type: 'sale',
      description: `Created invoice for $${total.toFixed(2)} — ${customerName.trim()} (${paymentType})`,
      user: user?.username,
    });

    setCart([]);
    setDiscount(0);
    setSearchTerm('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setPaymentType('Cash');
    toast.success('Invoice created successfully');
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Checkout / POS</h1>
        <p className="text-gray-600">Create new sale invoice</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: product browser ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 space-y-3">
              {/* Type filter */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'Inventory', 'Non-Inventory', 'Service', 'Bundle', 'Other'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filterType === type
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : type}
                  </button>
                ))}
              </div>

              {/* Tag filter */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${
                        filterTag === tag
                          ? 'bg-yellow-500 text-white'
                          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search items by name, SKU, or tag..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => {
                    const isInventory = product.itemType === 'Inventory';
                    const outOfStock = isInventory && product.quantity === 0;
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product.id)}
                        disabled={outOfStock}
                        className="flex items-start justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-200 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 truncate">{product.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${ITEM_TYPE_COLORS[product.itemType]}`}>
                              {product.itemType}
                            </span>
                            {product.tags?.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-gray-900">${product.price.toFixed(2)}</p>
                          <p className={`text-xs ${isInventory && product.quantity <= product.minStock ? 'text-orange-600' : 'text-gray-500'}`}>
                            {isInventory ? `Stock: ${product.quantity}` : product.unit}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">No items found</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Cart ── */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({cart.length})
              </h2>
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                Cart is empty. Select items above to add them.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {cart.map(item => (
                  <div key={item.productId} className="p-4 flex items-center gap-3">
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 truncate">{item.productName}</p>
                      {/* Price editor */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {editingPriceId === item.productId ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">$</span>
                            <input
                              ref={priceInputRef}
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingPriceValue}
                              onChange={e => setEditingPriceValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitPrice(item.productId);
                                if (e.key === 'Escape') setEditingPriceId(null);
                              }}
                              onBlur={() => commitPrice(item.productId)}
                              className="w-24 text-sm border border-yellow-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            />
                            <button
                              onClick={() => commitPrice(item.productId)}
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-600">${item.price.toFixed(2)} each</span>
                            {item.priceOverridden && (
                              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                custom
                              </span>
                            )}
                            <button
                              onClick={() => startEditPrice(item)}
                              className="text-gray-400 hover:text-yellow-600 transition-colors"
                              title="Override price"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {item.priceOverridden && (
                              <button
                                onClick={() => resetPrice(item.productId)}
                                className="text-xs text-gray-400 hover:text-red-500 underline"
                              >
                                reset
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        variant="ghost" size="sm" className="p-1.5"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        variant="ghost" size="sm" className="p-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Line total */}
                    <div className="w-20 text-right">
                      <p className="text-gray-900">${item.total.toFixed(2)}</p>
                    </div>

                    <Button
                      onClick={() => removeFromCart(item.productId)}
                      variant="ghost" size="sm"
                      className="p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: summary ── */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Customer
              </h2>
            </div>
            <div className="p-6 space-y-3 border-b border-gray-200">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Customer Name *</label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <Input
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <Input
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Cash', 'Credit', 'Debit', 'Cheque'] as PaymentType[]).map(pt => (
                    <button
                      key={pt}
                      onClick={() => setPaymentType(pt)}
                      className={`py-1.5 rounded-lg text-sm border-2 transition-colors ${
                        paymentType === pt
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">Discount (%)</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                  min="0" max="100"
                />
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discount}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700">
                <span>VAT ({settings.vatRate}%)</span>
                <span>${vatAmount.toFixed(2)}</span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-xl">
                  <span>Total</span>
                  <span className="text-yellow-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {cart.some(i => i.priceOverridden) && (
                <div className="text-xs text-amber-600 bg-amber-50 rounded p-2 text-center">
                  Invoice includes custom-priced items
                </div>
              )}

              <Button onClick={handleCheckout} className="w-full" disabled={cart.length === 0}>
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
