import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Eye, Printer, CheckCircle, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Invoice, Settings } from '../types';
import lbLogo from '../../imports/lb-logo-1.png';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function toDataUrl(src: string): Promise<string> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

// ── Print helper ─────────────────────────────────────────────────────────────
async function printInvoice(invoice: Invoice, settings: Settings) {
  const discountAmount = (invoice.subtotal * invoice.discount) / 100;
  const afterDiscount = invoice.subtotal - discountAmount;
  const logoDataUrl = await toDataUrl(lbLogo);

  const itemRows = invoice.items
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${item.productName}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:center">${item.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right">$${item.price.toFixed(2)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right">$${item.total.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const discountRow =
    invoice.discount > 0
      ? `<tr>
          <td colspan="2"></td>
          <td style="padding:6px 0;font-size:13px;color:#059669;text-align:right;padding-right:16px">Discount (${invoice.discount}%)</td>
          <td style="padding:6px 0;font-size:13px;color:#059669;text-align:right">-$${discountAmount.toFixed(2)}</td>
        </tr>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoice.id} — ${settings.businessName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #374151;
      background: #fff;
      padding: 0;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 18mm 14mm 18mm;
      display: flex;
      flex-direction: column;
    }
    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 4px solid #eab308;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
    }
    .company-sub {
      font-size: 11px;
      color: #6b7280;
      font-style: italic;
      margin-top: 4px;
    }
    .company-detail { font-size: 12px; color: #4b5563; margin-top: 2px; }
    .invoice-badge {
      background: #eab308;
      color: white;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 10px;
      display: inline-block;
    }
    .invoice-meta { font-size: 12px; color: #6b7280; text-align: right; margin-top: 4px; }
    .invoice-meta span { color: #111827; }
    /* ── Bill to / Status ── */
    .meta-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .meta-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      border: 2px solid;
    }
    .status-paid   { background:#d1fae5; color:#065f46; border-color:#059669; }
    .status-unpaid { background:#fef9c3; color:#713f12; border-color:#ca8a04; }
    /* ── Items table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table thead tr {
      background: #111827;
      color: #fff;
    }
    .items-table thead th {
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .items-table thead th:first-child { text-align: left; }
    .items-table thead th:not(:first-child) { text-align: right; }
    .items-table thead th:nth-child(2) { text-align: center; }
    /* ── Totals ── */
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { width: 280px; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      font-size: 13px;
      color: #374151;
      border-bottom: 1px solid #f3f4f6;
    }
    .totals-row.grand {
      background: #fefce8;
      border: 2px solid #eab308;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 4px;
      font-size: 16px;
      font-weight: 700;
      color: #854d0e;
      border-bottom: 2px solid #eab308;
    }
    /* ── Footer ── */
    .footer {
      margin-top: auto;
      border-top: 2px solid #e5e7eb;
      padding-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .footer-label { font-size: 12px; font-weight: 600; color: #111827; margin-bottom: 4px; }
    .footer-text  { font-size: 11px; color: #6b7280; line-height: 1.6; }
    .footer-right { text-align: right; }
    .print-stamp {
      text-align: center;
      margin-top: 16px;
      font-size: 10px;
      color: #9ca3af;
    }
    @page { size: A4; margin: 0; }
    @media print {
      html, body { width: 210mm; height: 297mm; }
      .page { padding: 14mm 16mm 12mm 16mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div style="display:flex;align-items:flex-start;gap:14px">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="L &amp; B Logo" style="width:72px;height:72px;object-fit:contain;flex-shrink:0">` : ''}
      <div>
      <div class="company-name">${settings.businessName}</div>
      <div class="company-detail">${settings.businessAddress}</div>
      <div class="company-detail">Tel: ${settings.businessPhone}</div>
      ${settings.businessEmail ? `<div class="company-detail">${settings.businessEmail}</div>` : ''}
      <div class="company-sub">Contractors Equipment &amp; Supplies — Renting &amp; Leasing</div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="invoice-badge">INVOICE</div>
      <div class="invoice-meta">Invoice #: <span>${invoice.id}</span></div>
      <div class="invoice-meta">Date: <span>${format(new Date(invoice.date), 'MMMM d, yyyy')}</span></div>
      <div class="invoice-meta">Served by: <span>${invoice.createdBy}</span></div>
    </div>
  </div>

  <!-- Bill To / Status -->
  <div class="meta-row">
    <div>
      <div class="section-label">Bill To</div>
      <div class="meta-box">
        <div style="font-size:14px;font-weight:600;color:#111827">${invoice.customerName || 'Walk-in / General'}</div>
        ${invoice.customerAddress ? `<div style="font-size:12px;color:#4b5563;margin-top:3px">${invoice.customerAddress}</div>` : ''}
        ${invoice.customerPhone ? `<div style="font-size:12px;color:#4b5563;margin-top:2px">Tel: ${invoice.customerPhone}</div>` : ''}
      </div>
    </div>
    <div>
      <div class="section-label">Payment</div>
      <div class="meta-box">
        <div class="status-badge ${invoice.paid ? 'status-paid' : 'status-unpaid'}">
          ${invoice.paid ? '✓ PAID IN FULL' : '⚠ PAYMENT DUE'}
        </div>
        <div style="font-size:12px;color:#374151;margin-top:8px">
          Method: <strong>${invoice.paymentType || 'Cash'}</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- Items -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align:left;border-radius:6px 0 0 0">Description</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right;border-radius:0 6px 0 0">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>$${invoice.subtotal.toFixed(2)}</span>
      </div>
      ${invoice.discount > 0 ? `
      <div class="totals-row" style="color:#059669">
        <span>Discount (${invoice.discount}%)</span>
        <span>-$${discountAmount.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>After Discount</span>
        <span>$${afterDiscount.toFixed(2)}</span>
      </div>` : ''}
      <div class="totals-row">
        <span>VAT (${invoice.vatRate}%)</span>
        <span>$${invoice.vatAmount.toFixed(2)}</span>
      </div>
      <div class="totals-row grand">
        <span>TOTAL DUE</span>
        <span>$${invoice.total.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <div class="footer-label">Payment Information</div>
      <div class="footer-text">
        Please make payment within 30 days.<br/>
        Reference invoice number when paying.<br/>
        Tel: ${settings.businessPhone}
      </div>
    </div>
    <div class="footer-right">
      <div class="footer-label">Thank You</div>
      <div class="footer-text">
        We appreciate your business.<br/>
        ${settings.businessEmail || ''}<br/>
        ${settings.businessName}
      </div>
    </div>
  </div>

  <div class="print-stamp">
    ${settings.businessName} • ${settings.businessAddress} • ${settings.businessPhone}
  </div>

</div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}

// ── Invoices list ─────────────────────────────────────────────────────────────
export function Invoices() {
  const { invoices, updateInvoice, settings } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(
      inv =>
        inv.id.toLowerCase().includes(term) ||
        inv.createdBy.toLowerCase().includes(term) ||
        (inv.customerName || '').toLowerCase().includes(term) ||
        inv.items.some(item => item.productName.toLowerCase().includes(term))
    );
  }, [invoices, searchTerm]);

  const togglePaid = (invoice: Invoice) => {
    updateInvoice(invoice.id, { paid: !invoice.paid });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Invoices</h1>
        <p className="text-gray-600">{invoices.length} total invoices</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by invoice ID, user, or product..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Invoice ID</th>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Customer</th>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Date</th>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Items</th>
                <th className="text-right px-6 py-3 text-sm text-gray-700">Total</th>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Payment</th>
                <th className="text-center px-6 py-3 text-sm text-gray-700">Status</th>
                <th className="text-right px-6 py-3 text-sm text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{invoice.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <p>{invoice.customerName || 'Walk-in'}</p>
                    {invoice.customerPhone && <p className="text-xs text-gray-500">{invoice.customerPhone}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {format(new Date(invoice.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{invoice.items.length}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    ${invoice.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {invoice.paymentType || 'Cash'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs gap-1 ${
                      invoice.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.paid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {invoice.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => setSelectedInvoice(invoice)}
                        variant="ghost" size="sm" className="p-2"
                        title="View invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => printInvoice(invoice, settings)}
                        variant="ghost" size="sm" className="p-2"
                        title="Print / Save as PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => togglePaid(invoice)}
                        variant="ghost" size="sm"
                        className={`px-3 py-1 text-xs ${
                          invoice.paid
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {invoice.paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            {searchTerm ? 'No invoices found matching your search' : 'No invoices created yet'}
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}

// ── Invoice preview modal ─────────────────────────────────────────────────────
function InvoiceModal({
  invoice,
  settings,
  onClose,
}: {
  invoice: Invoice;
  settings: Settings;
  onClose: () => void;
}) {
  const discountAmount = (invoice.subtotal * invoice.discount) / 100;
  const afterDiscount = invoice.subtotal - discountAmount;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-[700px] w-full max-h-[92vh] overflow-auto shadow-2xl">

        {/* Modal toolbar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-mono text-sm">{invoice.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${invoice.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {invoice.paid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => printInvoice(invoice, settings)}
              variant="secondary" size="sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice preview (screen-only, not what gets printed) */}
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between pb-6 mb-6 border-b-4 border-yellow-500">
            <div>
              <p className="text-2xl text-gray-900">{settings.businessName}</p>
              <p className="text-sm text-gray-600 mt-1">{settings.businessAddress}</p>
              <p className="text-sm text-gray-600">Tel: {settings.businessPhone}</p>
              <p className="text-xs text-gray-500 italic mt-1">Contractors Equipment &amp; Supplies — Renting &amp; Leasing</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-yellow-500 text-white px-5 py-2 rounded-lg mb-3">
                <span className="text-lg tracking-widest">INVOICE</span>
              </div>
              <p className="text-xs text-gray-500">Invoice #: <span className="text-gray-900">{invoice.id}</span></p>
              <p className="text-xs text-gray-500">Date: <span className="text-gray-900">{format(new Date(invoice.date), 'MMMM d, yyyy')}</span></p>
              <p className="text-xs text-gray-500">By: <span className="text-gray-900">{invoice.createdBy}</span></p>
            </div>
          </div>

          {/* Bill to / status */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Bill To</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-0.5">
                <p className="text-gray-900">{invoice.customerName || 'Walk-in / General'}</p>
                {invoice.customerAddress && <p className="text-xs text-gray-500">{invoice.customerAddress}</p>}
                {invoice.customerPhone && <p className="text-xs text-gray-500">Tel: {invoice.customerPhone}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Payment</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded border ${
                  invoice.paid
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}>
                  {invoice.paid ? '✓ PAID IN FULL' : '⚠ PAYMENT DUE'}
                </span>
                <p className="text-xs text-gray-600">Method: <span className="text-gray-900">{invoice.paymentType || 'Cash'}</span></p>
              </div>
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-4 py-2.5 rounded-tl">Description</th>
                <th className="text-center px-4 py-2.5">Qty</th>
                <th className="text-right px-4 py-2.5">Unit Price</th>
                <th className="text-right px-4 py-2.5 rounded-tr">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-900">{item.productName}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right text-gray-700">${item.price.toFixed(2)}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right text-gray-900">${item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 py-1">
                <span>Subtotal</span><span className="text-gray-900">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && <>
                <div className="flex justify-between text-green-600 py-1">
                  <span>Discount ({invoice.discount}%)</span><span>-${discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 py-1">
                  <span>After Discount</span><span className="text-gray-900">${afterDiscount.toFixed(2)}</span>
                </div>
              </>}
              <div className="flex justify-between text-gray-600 py-1 border-b border-gray-200">
                <span>VAT ({invoice.vatRate}%)</span><span className="text-gray-900">${invoice.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 px-3 bg-yellow-50 border-2 border-yellow-500 rounded-lg text-yellow-700">
                <span className="uppercase tracking-wide text-sm">Total Due</span>
                <span className="text-base">${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="border-t border-gray-200 pt-4 flex justify-between text-xs text-gray-500">
            <span>Please pay within 30 days referencing invoice number</span>
            <span>Thank you for your business!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
