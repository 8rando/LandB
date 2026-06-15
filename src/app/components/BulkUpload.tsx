import { useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  X,
  ChevronRight,
  Info,
  RefreshCw,
  PackagePlus,
} from 'lucide-react';
import { ItemType, Product } from '../types';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const VALID_ITEM_TYPES: ItemType[] = ['Inventory', 'Non-Inventory', 'Service', 'Bundle', 'Other'];

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  Inventory: 'bg-blue-100 text-blue-700',
  'Non-Inventory': 'bg-slate-100 text-slate-700',
  Service: 'bg-green-100 text-green-700',
  Bundle: 'bg-orange-100 text-orange-800',
  Other: 'bg-gray-100 text-gray-600',
};

interface ParsedRow {
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
  _willUpdate?: boolean; // true when a matching SKU exists
}

interface RowError {
  row: number;
  message: string;
}

type Step = 'upload' | 'review' | 'done';

// ── Shared columns definition ────────────────────────────────────────────────
const COLUMNS = [
  { key: 'name',        label: 'name',        required: true,  desc: 'Item name' },
  { key: 'description', label: 'description', required: false, desc: 'Short description or specification' },
  { key: 'sku',         label: 'sku',         required: false, desc: 'Your internal item / stock code' },
  { key: 'itemtype',    label: 'itemtype',     required: true,  desc: 'Inventory | Non-Inventory | Service | Bundle | Other' },
  { key: 'tags',        label: 'tags',         required: false, desc: 'Categories separated by | (e.g. Supplies|Office)' },
  { key: 'quantity',    label: 'quantity',     required: false, desc: 'Stock on hand — Inventory & Bundle only' },
  { key: 'price',       label: 'price',        required: true,  desc: 'Selling price (number)' },
  { key: 'cost',        label: 'cost',         required: false, desc: 'Your purchase / cost price' },
  { key: 'minstock',    label: 'minstock',     required: false, desc: 'Low-stock alert threshold' },
  { key: 'unit',        label: 'unit',         required: false, desc: 'each | hour | lb | kg | box | ream | license …' },
];

const HEADER_ROW = COLUMNS.map(c => c.label);

// ── Helpers ──────────────────────────────────────────────────────────────────
function productsToRows(products: Product[]): (string | number)[][] {
  return products.map(p => [
    p.name,
    p.description ?? '',
    p.sku ?? '',
    p.itemType,
    (p.tags ?? []).join('|'),
    p.quantity,
    p.price,
    p.cost,
    p.minStock,
    p.unit,
  ]);
}

function buildWorkbook(dataRows: (string | number)[][], sheetName = 'Items'): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Instructions sheet ───────────────────────────────────────────────────
  const instructions: (string | number)[][] = [
    ['L & B Limited — Inventory Import / Export Template'],
    [''],
    ['HOW TO USE:'],
    ['1. Fill in (or edit) rows in the "Items" sheet — one item per row.'],
    ['2. Save the file as .xlsx or .csv.'],
    ['3. Upload it back into the system via Bulk Import.'],
    ['4. If a row has the same SKU as an existing item, that item is UPDATED.'],
    ['5. Rows without an SKU match are treated as NEW items.'],
    [''],
    ['COLUMN REFERENCE:'],
    ...COLUMNS.map(c => [c.label + (c.required ? ' *' : ''), c.desc]),
    [''],
    ['ITEM TYPES:'],
    ['Inventory',     'Physical products — stock tracked and decremented on sale'],
    ['Non-Inventory', 'Items you sell but do not track in stock (e.g. digital goods)'],
    ['Service',       'Labour / services — no stock tracking (e.g. hourly consulting)'],
    ['Bundle',        'A package of items sold together'],
    ['Other',         'Miscellaneous charges, fees, or anything else'],
    [''],
    ['* = required column'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
  wsInfo['!cols'] = [{ wch: 20 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions');

  // ── Items sheet ──────────────────────────────────────────────────────────
  const wsData = XLSX.utils.aoa_to_sheet([HEADER_ROW, ...dataRows]);
  wsData['!cols'] = [
    { wch: 24 }, { wch: 38 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, sheetName);

  return wb;
}

// ── Component ────────────────────────────────────────────────────────────────
export function BulkUpload() {
  const { products, upsertProducts, addActivity } = useData();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null);

  // ── Export current inventory ─────────────────────────────────────────────
  const exportCurrentInventory = () => {
    if (products.length === 0) {
      toast.error('No items in inventory to export');
      return;
    }
    const wb = buildWorkbook(productsToRows(products), 'Items');
    XLSX.writeFile(wb, 'LB_Inventory_Export.xlsx');
    toast.success(`Exported ${products.length} items to Excel`);
  };

  // ── Download blank template ──────────────────────────────────────────────
  const downloadTemplate = () => {
    const sampleRows: (string | number)[][] = [
      ['Black Rubber Matting', '1m x 2m heavy duty rubber matting', 'MAT-BLK-1X2', 'Inventory', 'Matting|Rubber', 20, 45.00, 22.00, 5, 'each'],
      ['Black Rubber Matting', '0.5m x 1m rubber matting', 'MAT-BLK-05X1', 'Inventory', 'Matting|Rubber', 30, 18.00, 9.00, 5, 'each'],
      ['Metal Stake 300mm', 'Galvanised ground stake 300mm', 'STK-MTL-300', 'Inventory', 'Stakes|Hardware', 100, 3.50, 1.50, 20, 'each'],
      ['Metal Stake 600mm', 'Galvanised ground stake 600mm', 'STK-MTL-600', 'Inventory', 'Stakes|Hardware', 80, 6.00, 2.80, 20, 'each'],
      ['Custom Cut Matting', 'Matting cut to customer size — price set at sale', 'MAT-CUSTOM', 'Inventory', 'Matting|Custom', 10, 0.00, 0.00, 2, 'each'],
      ['Delivery Charge', 'Standard local delivery', 'FEE-DEL', 'Other', 'Fees', 0, 15.00, 0, 0, 'each'],
      ['Installation Service', 'On-site installation per hour', 'SVC-INSTALL', 'Service', 'Services', 0, 75.00, 0, 0, 'hour'],
      ['Office Chair', 'Ergonomic adjustable chair', 'FRN-CHR-001', 'Inventory', 'Furniture|Office', 10, 249.99, 140.00, 5, 'each'],
      ['Printer Paper A4', '500 sheets 80gsm', 'SUP-PPR-A4', 'Inventory', 'Supplies|Office', 50, 12.99, 7.50, 20, 'ream'],
    ];
    const wb = buildWorkbook(sampleRows, 'Items');
    XLSX.writeFile(wb, 'LB_Inventory_Template.xlsx');
    toast.success('Sample template downloaded');
  };

  // ── Parse uploaded file ──────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');
    if (!isExcel && !isCsv) {
      toast.error('Please upload an Excel (.xlsx) or CSV (.csv) file');
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        let wb: XLSX.WorkBook;
        if (isExcel) {
          wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
        } else {
          wb = XLSX.read(e.target?.result as string, { type: 'string' });
        }

        const sheetName = wb.SheetNames.includes('Items') ? 'Items' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rows.length < 2) {
          setErrors([{ row: 0, message: 'File has no data rows' }]);
          setPreview([]);
          setStep('review');
          return;
        }

        const headers = (rows[0] as string[]).map(h =>
          String(h).trim().toLowerCase().replace(/\s+/g, '')
        );

        const missing = ['name', 'itemtype', 'price'].filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setErrors([{ row: 1, message: `Missing required columns: ${missing.join(', ')}` }]);
          setPreview([]);
          setStep('review');
          return;
        }

        const get = (row: any[], col: string) => {
          const idx = headers.indexOf(col);
          return idx >= 0 ? String(row[idx] ?? '').trim() : '';
        };

        const parsed: ParsedRow[] = [];
        const errs: RowError[] = [];

        // Build a SKU lookup for existing products
        const existingSkuMap = new Map(
          products
            .filter(p => p.sku)
            .map(p => [p.sku.toLowerCase(), true])
        );

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (row.every(c => c === '' || c == null)) continue;

          const name = get(row, 'name');
          if (!name) { errs.push({ row: i + 1, message: 'Missing item name' }); continue; }

          const rawType = get(row, 'itemtype');
          const itemType = VALID_ITEM_TYPES.find(t => t.toLowerCase() === rawType.toLowerCase());
          if (!itemType) {
            errs.push({ row: i + 1, message: `Invalid item type "${rawType}". Use: ${VALID_ITEM_TYPES.join(', ')}` });
            continue;
          }

          const price = parseFloat(get(row, 'price') || '0');
          if (isNaN(price) || price < 0) {
            errs.push({ row: i + 1, message: 'Invalid price — must be a number ≥ 0' });
            continue;
          }

          const cost = parseFloat(get(row, 'cost') || '0');
          const qty = parseInt(get(row, 'quantity') || '0');
          const min = parseInt(get(row, 'minstock') || '0');
          const sku = get(row, 'sku');
          const tags = get(row, 'tags')
            .split('|').map(t => t.trim()).filter(Boolean);
          const isInventory = itemType === 'Inventory' || itemType === 'Bundle';

          parsed.push({
            name,
            description: get(row, 'description'),
            sku,
            itemType,
            tags,
            quantity: isInventory && !isNaN(qty) ? qty : 0,
            price,
            cost: isNaN(cost) ? 0 : cost,
            minStock: isInventory && !isNaN(min) ? min : 0,
            unit: get(row, 'unit') || 'each',
            _willUpdate: sku ? existingSkuMap.has(sku.toLowerCase()) : false,
          });
        }

        setPreview(parsed);
        setErrors(errs);
        setStep('review');
      } catch (err) {
        toast.error('Failed to parse file — please check the format');
        console.error(err);
      }
    };

    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }, [products]);

  // ── Drag & drop / file input ─────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  // ── Import (upsert) ──────────────────────────────────────────────────────
  const handleImport = () => {
    if (preview.length === 0) { toast.error('No valid items to import'); return; }
    const result = upsertProducts(preview.map(({ _willUpdate: _, ...p }) => p));
    setImportResult(result);
    addActivity({
      type: 'stock_update',
      description: `Bulk import via ${fileName}: ${result.added} added, ${result.updated} updated`,
      user: user?.username,
    });
    toast.success(`Done — ${result.added} added, ${result.updated} updated`);
    setStep('done');
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setPreview([]);
    setErrors([]);
    setImportResult(null);
  };

  const addedCount = preview.filter(r => !r._willUpdate).length;
  const updatedCount = preview.filter(r => r._willUpdate).length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2">Bulk Import / Export</h1>
        <p className="text-gray-600">Upload an Excel or CSV file to add or update multiple items at once</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {(['upload', 'review', 'done'] as Step[]).map((s, idx) => {
          const labels: Record<Step, string> = { upload: 'Upload File', review: 'Review', done: 'Complete' };
          const past = ['upload', 'review', 'done'].indexOf(s) < ['upload', 'review', 'done'].indexOf(step);
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                step === s ? 'bg-yellow-500 text-white' : past ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <span>{idx + 1}</span>
                <span>{labels[s]}</span>
              </div>
              {idx < 2 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Drop zone + actions */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer mb-6 ${
                  isDragging
                    ? 'border-yellow-500 bg-yellow-50 scale-[1.01]'
                    : 'border-gray-300 hover:border-yellow-400 hover:bg-gray-50'
                }`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
                onClick={() => document.getElementById('bulk-file-input')?.click()}
              >
                <FileSpreadsheet className={`w-14 h-14 mx-auto mb-4 transition-colors ${isDragging ? 'text-yellow-500' : 'text-gray-300'}`} />
                <p className="text-gray-700 mb-1">
                  <span className="text-yellow-600">Click to browse</span> or drag & drop
                </p>
                <p className="text-sm text-gray-500">Excel (.xlsx) or CSV (.csv) files accepted</p>
                <input
                  id="bulk-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Download buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Button onClick={downloadTemplate} variant="secondary" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample Template
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-1.5">
                    Blank template with example items including matting & stakes
                  </p>
                </div>
                <div>
                  <Button
                    onClick={exportCurrentInventory}
                    variant="secondary"
                    className="w-full"
                    disabled={products.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Current Inventory
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-1.5">
                    Download all {products.length} current items as Excel — edit & re-upload to update
                  </p>
                </div>
              </div>
            </div>

            {/* Update note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <RefreshCw className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="mb-1"><strong>Export → Edit → Re-upload</strong> workflow</p>
                <p className="text-xs text-blue-700">Export your current inventory, edit prices/quantities/tags in Excel, then upload the file back. Rows with a matching SKU are <em>updated</em>; rows without a match are <em>added as new</em> items.</p>
              </div>
            </div>
          </div>

          {/* Column reference */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-yellow-500" />
              <h3 className="text-gray-800">Column Reference</h3>
            </div>
            <div className="space-y-2.5">
              {COLUMNS.map(({ key, required, desc }) => (
                <div key={key} className="flex items-start gap-2">
                  <code className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 font-mono ${
                    required ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {key}
                  </code>
                  <span className="text-xs text-gray-600">{desc}{required ? ' *' : ''}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">* Required columns</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{fileName}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {addedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                    <PackagePlus className="w-3.5 h-3.5" />
                    {addedCount} new
                  </span>
                )}
                {updatedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {updatedCount} update{updatedCount > 1 ? 's' : ''}
                  </span>
                )}
                {errors.length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.length} skipped
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={reset} variant="secondary" size="sm">
                <X className="w-4 h-4 mr-1" />
                Change File
              </Button>
              <Button onClick={handleImport} size="sm" disabled={preview.length === 0}>
                {addedCount > 0 && updatedCount > 0
                  ? `Import (${addedCount} add + ${updatedCount} update)`
                  : addedCount > 0
                  ? `Add ${addedCount} Items`
                  : `Update ${updatedCount} Items`}
              </Button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 mb-1.5">{errors.length} row{errors.length > 1 ? 's' : ''} skipped:</p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc ml-4">
                    {errors.slice(0, 8).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.message}</li>
                    ))}
                    {errors.length > 8 && <li>…and {errors.length - 8} more. Fix in your file and re-upload.</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Review before importing — <span className="text-green-700">green rows are new</span>, <span className="text-blue-700">blue rows will update existing items</span>.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 w-8">#</th>
                      <th className="text-left px-4 py-3 text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 text-gray-600">Type</th>
                      <th className="text-left px-4 py-3 text-gray-600">Tags</th>
                      <th className="text-left px-4 py-3 text-gray-600">SKU</th>
                      <th className="text-right px-4 py-3 text-gray-600">Qty</th>
                      <th className="text-right px-4 py-3 text-gray-600">Price</th>
                      <th className="text-right px-4 py-3 text-gray-600">Cost</th>
                      <th className="text-left px-4 py-3 text-gray-600">Unit</th>
                      <th className="text-center px-4 py-3 text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((item, idx) => (
                      <tr key={idx} className={`hover:brightness-95 ${item._willUpdate ? 'bg-blue-50' : 'bg-green-50'}`}>
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${ITEM_TYPE_COLORS[item.itemType]}`}>
                            {item.itemType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {item.itemType === 'Inventory' || item.itemType === 'Bundle' ? item.quantity : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">${item.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">${item.cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{item.unit}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item._willUpdate
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {item._willUpdate ? 'update' : 'new'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              No valid rows found in file.
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && importResult && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="mb-2 text-gray-900">Import Complete</h2>
          <div className="flex justify-center gap-6 mb-6 mt-4">
            {importResult.added > 0 && (
              <div className="text-center">
                <p className="text-3xl text-green-600">{importResult.added}</p>
                <p className="text-sm text-gray-600">New items added</p>
              </div>
            )}
            {importResult.updated > 0 && (
              <div className="text-center">
                <p className="text-3xl text-blue-600">{importResult.updated}</p>
                <p className="text-sm text-gray-600">Items updated</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={reset} variant="secondary">Import Another File</Button>
            <Button onClick={() => window.location.assign('/inventory')}>View Inventory</Button>
          </div>
        </div>
      )}
    </div>
  );
}
