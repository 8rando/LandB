import { useState, useMemo, KeyboardEvent } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Search, Edit2, Trash2, X, Tag } from 'lucide-react';
import { Product, ItemType } from '../types';

const ITEM_TYPES: ItemType[] = ['Inventory', 'Non-Inventory', 'Service', 'Bundle', 'Other'];

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  Inventory: 'bg-blue-100 text-blue-800',
  'Non-Inventory': 'bg-slate-100 text-slate-700',
  Service: 'bg-green-100 text-green-800',
  Bundle: 'bg-orange-100 text-orange-800',
  Other: 'bg-gray-100 text-gray-700',
};

const COMMON_UNITS = ['each', 'hour', 'day', 'lb', 'kg', 'oz', 'liter', 'gallon', 'box', 'pack', 'ream', 'license', 'meter', 'ft'];

export function Inventory() {
  const { products, addProduct, updateProduct, deleteProduct, addActivity } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
  const [filterTag, setFilterTag] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    products.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (filterType !== 'all') {
      result = result.filter(p => p.itemType === filterType);
    }

    if (filterTag) {
      result = result.filter(p => p.tags?.includes(filterTag));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.tags?.some(t => t.toLowerCase().includes(term))
      );
    }

    return result;
  }, [products, searchTerm, filterType, filterTag]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
  };

  const handleDelete = (product: Product) => {
    if (confirm(`Delete "${product.name}"?`)) {
      deleteProduct(product.id);
      addActivity({
        type: 'stock_update',
        description: `Deleted item: ${product.name}`,
        user: user?.username,
      });
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-2">Items & Inventory</h1>
          <p className="text-gray-600">{products.length} items tracked</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, description, SKU, or tag..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterType === 'all'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Types
            </button>
            {ITEM_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(filterType === type ? 'all' : type)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filterType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <Tag className="w-4 h-4 text-gray-400" />
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-gray-700">SKU</th>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Name</th>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Type</th>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Tags</th>
                <th className="text-right px-6 py-3 text-sm text-gray-700">Qty / Unit</th>
                <th className="text-right px-6 py-3 text-sm text-gray-700">Price</th>
                <th className="text-right px-6 py-3 text-sm text-gray-700">Cost</th>
                <th className="text-right px-6 py-3 text-sm text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{product.sku}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{product.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${ITEM_TYPE_COLORS[product.itemType]}`}>
                      {product.itemType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {product.tags?.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {product.itemType === 'Service' || product.itemType === 'Non-Inventory' ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className={product.quantity <= product.minStock && product.minStock > 0 ? 'text-orange-600' : 'text-gray-900'}>
                        {product.quantity}
                      </span>
                    )}
                    <span className="text-gray-400 ml-1 text-xs">/{product.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                    ${product.cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user?.role === 'admin' && (
                        <>
                          <Button onClick={() => handleEdit(product)} variant="ghost" size="sm" className="p-2">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(product)}
                            variant="ghost"
                            size="sm"
                            className="p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            {searchTerm || filterType !== 'all' || filterTag
              ? 'No items found matching your filters'
              : 'No items yet. Add your first item to get started.'}
          </div>
        )}
      </div>

      {isAddModalOpen && <ItemModal onClose={() => setIsAddModalOpen(false)} />}
      {editingProduct && (
        <ItemModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="border border-gray-300 rounded-lg p-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-yellow-500 focus-within:border-transparent min-h-[42px]">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-sm">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="hover:text-yellow-600">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
      />
    </div>
  );
}

function ItemModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { addProduct, updateProduct, addActivity } = useData();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    itemType: product?.itemType || ('Inventory' as ItemType),
    tags: product?.tags || [],
    quantity: product?.quantity ?? 0,
    price: product?.price ?? 0,
    cost: product?.cost ?? 0,
    minStock: product?.minStock ?? 0,
    unit: product?.unit || 'each',
  });

  const [customUnit, setCustomUnit] = useState(
    COMMON_UNITS.includes(formData.unit) ? '' : formData.unit
  );

  const isService = formData.itemType === 'Service' || formData.itemType === 'Non-Inventory';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalUnit = customUnit.trim() || formData.unit;
    const payload = { ...formData, unit: finalUnit };

    if (product) {
      updateProduct(product.id, payload);
      addActivity({
        type: 'stock_update',
        description: `Updated item: ${formData.name}`,
        user: user?.username,
      });
    } else {
      addProduct(payload);
      addActivity({
        type: 'stock_update',
        description: `Added item: ${formData.name} (${formData.itemType})`,
        user: user?.username,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2>{product ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Item Type */}
          <div>
            <label className="block text-sm mb-2 text-gray-700">Item Type</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {ITEM_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, itemType: type })}
                  className={`px-2 py-2 rounded-lg text-sm border-2 transition-colors ${
                    formData.itemType === type
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.itemType === 'Inventory' && 'Physical products tracked by quantity'}
              {formData.itemType === 'Non-Inventory' && 'Items purchased but not tracked in inventory'}
              {formData.itemType === 'Service' && 'Labor or service you provide (no quantity tracking)'}
              {formData.itemType === 'Bundle' && 'Group of items sold together as a package'}
              {formData.itemType === 'Other' && 'Miscellaneous charges, fees, or custom items'}
            </p>
          </div>

          {/* Name & SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm mb-2 text-gray-700">Item Name *</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Office Chair, Consultation Hour"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-700">SKU / Item Code</label>
              <Input
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., FRN-CHR-001"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm mb-2 text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description, specs, or notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm mb-2 text-gray-700">Tags</label>
            <TagInput
              tags={formData.tags}
              onChange={tags => setFormData({ ...formData, tags })}
            />
            <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a tag. E.g., Furniture, Electronics, Supplies, Services</p>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm mb-2 text-gray-700">Unit of Measure</label>
            <div className="flex gap-2">
              <select
                value={COMMON_UNITS.includes(formData.unit) ? formData.unit : '__custom__'}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setFormData({ ...formData, unit: customUnit || '' });
                  } else {
                    setFormData({ ...formData, unit: e.target.value });
                    setCustomUnit('');
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>
              {(!COMMON_UNITS.includes(formData.unit) || customUnit) && (
                <Input
                  value={customUnit}
                  onChange={e => {
                    setCustomUnit(e.target.value);
                    setFormData({ ...formData, unit: e.target.value });
                  }}
                  placeholder="Custom unit"
                  className="flex-1"
                />
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-gray-700">
                {formData.itemType === 'Service' ? 'Rate' : 'Retail Price'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-700">Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Min Stock (only for inventory items) */}
          {!isService && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Quantity on Hand</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Low Stock Alert At</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">{product ? 'Update Item' : 'Add Item'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
