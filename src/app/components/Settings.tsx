import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Settings as SettingsIcon, Save, PanelLeft, PanelLeftClose } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const { settings, updateSettings } = useData();
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    toast.success('Settings saved');
  };

  const handleSidebarToggle = (mode: 'expanded' | 'hover') => {
    setFormData(prev => ({ ...prev, sidebarMode: mode }));
    // Apply immediately so user sees the effect in real time
    updateSettings({ sidebarMode: mode });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Settings</h1>
        <p className="text-gray-600">Manage business configuration and appearance</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* ── Appearance ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="flex items-center gap-2">
              <PanelLeft className="w-5 h-5" />
              Appearance
            </h2>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-700 mb-4">Sidebar Style</p>
            <div className="grid grid-cols-2 gap-3">

              {/* Always Expanded */}
              <button
                type="button"
                onClick={() => handleSidebarToggle('expanded')}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  formData.sidebarMode !== 'hover'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Mini sidebar preview — expanded */}
                <div className="flex gap-2 mb-3 pointer-events-none select-none">
                  <div className="w-24 bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-1.5 py-1 px-1 rounded mb-0.5">
                        <div className={`w-2 h-2 rounded flex-shrink-0 ${i === 0 ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                        <div className={`h-1.5 rounded flex-1 ${i === 0 ? 'bg-yellow-300' : 'bg-gray-200'}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-lg" />
                </div>
                <p className="text-sm text-gray-900">Always Expanded</p>
                <p className="text-xs text-gray-500 mt-0.5">Sidebar stays open at full width all the time</p>
                {formData.sidebarMode !== 'hover' && (
                  <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>

              {/* Hover to Expand */}
              <button
                type="button"
                onClick={() => handleSidebarToggle('hover')}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  formData.sidebarMode === 'hover'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Mini sidebar preview — collapsed */}
                <div className="flex gap-2 mb-3 pointer-events-none select-none">
                  <div className="w-8 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center justify-center py-1 mb-0.5">
                        <div className={`w-2 h-2 rounded ${i === 0 ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-lg" />
                </div>
                <p className="text-sm text-gray-900">Hover to Expand</p>
                <p className="text-xs text-gray-500 mt-0.5">Collapses to icons — expands when you hover over it</p>
                {formData.sidebarMode === 'hover' && (
                  <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>

            </div>

            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
              <PanelLeftClose className="w-3.5 h-3.5" />
              Changes apply instantly — no need to save
            </p>
          </div>
        </div>

        {/* ── Business Information ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Business Information
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm mb-2 text-gray-700">Business Name</label>
              <Input
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Business Address</label>
              <Input
                value={formData.businessAddress}
                onChange={e => setFormData({ ...formData, businessAddress: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Phone</label>
                <Input
                  value={formData.businessPhone}
                  onChange={e => setFormData({ ...formData, businessPhone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Email</label>
                <Input
                  type="email"
                  value={formData.businessEmail}
                  onChange={e => setFormData({ ...formData, businessEmail: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="mb-4">System Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700">VAT Rate (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.vatRate}
                    onChange={e => setFormData({ ...formData, vatRate: Number(e.target.value) })}
                    min="0" max="100" required
                  />
                  <p className="text-xs text-gray-500 mt-1">Default tax rate for invoices</p>
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700">Low Stock Threshold</label>
                  <Input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={e => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                    min="0" required
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-yellow-800">
            All data is stored locally in your browser. Clearing browser data will reset all settings, products, and invoices.
          </p>
        </div>
      </div>
    </div>
  );
}
