import { useState, useMemo } from 'react';
import { useSupabaseData } from '../context/SupabaseDataContext';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Eye, Printer, CheckCircle, XCircle, X, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

// ── Print helper (ink-friendly: white background, thin black lines only) ───────
async function printInvoice(invoice: Invoice, settings: Settings) {
  const discountAmount = (invoice.subtotal * invoice.discount) / 100;
  const logoDataUrl = await toDataUrl(lbLogo);

  // Payment terms: 30 days from the invoice date.
  const dueDate = new Date(invoice.date);
  dueDate.setDate(dueDate.getDate() + 30);

  const amountPaid = invoice.paid ? invoice.total : 0;
  const balanceDue = invoice.paid ? 0 : invoice.total;

  const itemRows = invoice.items
    .map(
      (item, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${item.productName}</td>
        <td class="c">${item.quantity}</td>
        <td class="r">$${item.price.toFixed(2)}</td>
        <td class="r">$${item.total.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${invoice.voided ? 'VOID ' : ''}Invoice ${format(new Date(invoice.date), 'yyyy-MM-dd')} ${settings.businessName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: Arial, 'Helvetica Neue', sans-serif;
      font-size: 12px;
      color: #000;
      background: #fff;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 16mm 16mm 14mm 16mm;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    /* ── VOID watermark ── */
    .void-mark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-32deg);
      font-size: 150px;
      font-weight: 800;
      letter-spacing: 14px;
      color: rgba(220, 38, 38, 0.16);
      border: 10px solid rgba(220, 38, 38, 0.16);
      border-radius: 16px;
      padding: 8px 56px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 999;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .brand { display: flex; align-items: flex-start; gap: 12px; }
    .brand img { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
    .company-name { font-size: 18px; font-weight: 700; }
    .company-detail { font-size: 11px; color: #222; margin-top: 2px; }
    .company-sub { font-size: 10px; color: #444; font-style: italic; margin-top: 3px; }
    .inv-title { font-size: 24px; font-weight: 700; letter-spacing: 1px; text-align: right; margin-bottom: 8px; }
    .meta-table { border-collapse: collapse; margin-left: auto; }
    .meta-table td { border: 1px solid #000; padding: 4px 10px; font-size: 11px; }
    .meta-table td.label { font-weight: 700; }
    .meta-table td.value { text-align: right; min-width: 96px; }
    .rule { border: 0; border-top: 1px solid #000; margin: 12px 0 14px; }
    /* ── Parties ── */
    .parties {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 16px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .party-name { font-size: 12px; font-weight: 700; }
    .party-detail { font-size: 11px; color: #222; margin-top: 1px; }
    .party-right { text-align: right; }
    /* ── Items table ── */
    .items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .items th, .items td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; vertical-align: top; }
    .items th { font-weight: 700; text-align: left; }
    .items th.c, .items td.c { text-align: center; }
    .items th.r, .items td.r { text-align: right; }
    .items th.num, .items td.c:first-child { width: 32px; }
    /* ── Totals ── */
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals { border-collapse: collapse; }
    .totals td { border: 1px solid #000; padding: 5px 12px; font-size: 11px; }
    .totals td.label { font-weight: 600; }
    .totals td.value { text-align: right; min-width: 96px; }
    .totals tr.grand td { font-weight: 700; font-size: 13px; }
    /* ── Footer ── */
    .footer {
      margin-top: auto;
      border-top: 1px solid #000;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 10px;
      color: #222;
      line-height: 1.6;
    }
    .footer-right { text-align: right; }
    .page-num { text-align: center; font-size: 10px; color: #555; margin-top: 10px; }
    @page { size: A4; margin: 0; }
    @media print {
      html, body { width: 210mm; }
      /* Don't force full-sheet height in print: an element exactly 297mm tall
         overflows by a sub-pixel and spills onto a blank second page. Let the
         page be as tall as its content instead. */
      .page { min-height: 0; padding: 14mm 16mm 12mm 16mm; }
    }
  </style>
</head>
<body>
<div class="page">
  ${invoice.voided ? '<div class="void-mark">VOID</div>' : ''}

  <!-- Header -->
  <div class="header">
    <div class="brand">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="${settings.businessName} logo"/>` : ''}
      <div>
        <div class="company-name">${settings.businessName}</div>
        <div class="company-detail">${settings.businessAddress}</div>
        <div class="company-detail">Tel: ${settings.businessPhone}</div>
        ${settings.businessEmail ? `<div class="company-detail">${settings.businessEmail}</div>` : ''}
        ${settings.businessTagline ? `<div class="company-sub">${settings.businessTagline}</div>` : ''}
      </div>
    </div>
    <div>
      <div class="inv-title">INVOICE</div>
      <table class="meta-table">
        <tr><td class="label">Invoice #</td><td class="value">${invoice.invoiceNumber || invoice.id}</td></tr>
        <tr><td class="label">Date</td><td class="value">${format(new Date(invoice.date), 'MMM d, yyyy')}</td></tr>
        <tr><td class="label">Due Date</td><td class="value">${format(dueDate, 'MMM d, yyyy')}</td></tr>
        <tr><td class="label">Amount Due</td><td class="value">$${balanceDue.toFixed(2)}</td></tr>
      </table>
    </div>
  </div>

  <hr class="rule"/>

  <!-- Parties -->
  <div class="parties">
    <div>
      <div class="section-label">Bill To</div>
      <div class="party-name">${invoice.customerName || 'Walk-in / General'}</div>
      ${invoice.customerAddress ? `<div class="party-detail">${invoice.customerAddress}</div>` : ''}
      ${invoice.customerPhone ? `<div class="party-detail">Tel: ${invoice.customerPhone}</div>` : ''}
    </div>
    <div class="party-right">
      <div class="section-label">Details</div>
      <div class="party-detail">Served by: ${invoice.createdBy}</div>
      <div class="party-detail">Payment method: ${invoice.paymentType || 'Cash'}</div>
      <div class="party-detail">Status: ${invoice.paid ? 'PAID IN FULL' : 'PAYMENT DUE'}</div>
    </div>
  </div>

  <!-- Items -->
  <table class="items">
    <thead>
      <tr>
        <th class="c num">#</th>
        <th>Description</th>
        <th class="c">Qty</th>
        <th class="r">Unit Price</th>
        <th class="r">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <table class="totals">
      <tr><td class="label">Subtotal</td><td class="value">$${invoice.subtotal.toFixed(2)}</td></tr>
      ${invoice.discount > 0 ? `<tr><td class="label">Discount (${invoice.discount}%)</td><td class="value">-$${discountAmount.toFixed(2)}</td></tr>` : ''}
      <tr><td class="label">VAT (${invoice.vatRate}%)</td><td class="value">$${invoice.vatAmount.toFixed(2)}</td></tr>
      <tr class="grand"><td class="label">Total</td><td class="value">$${invoice.total.toFixed(2)}</td></tr>
      <tr><td class="label">Amount Paid</td><td class="value">$${amountPaid.toFixed(2)}</td></tr>
      <tr class="grand"><td class="label">Balance Due</td><td class="value">$${balanceDue.toFixed(2)}</td></tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      Please make payment within 30 days, referencing the invoice number.<br/>
      Tel: ${settings.businessPhone}${settings.businessEmail ? ` &nbsp;•&nbsp; ${settings.businessEmail}` : ''}
    </div>
    <div class="footer-right">
      Thank you for your business.<br/>
      ${settings.businessName}
    </div>
  </div>

  <div class="page-num">Page 1 of 1</div>

</div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  // Off-screen but with real A4-ish dimensions: a 0×0 / display:none iframe
  // can print blank in Chrome because its document is never laid out.
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;';

  // Guarded so it can only fire once, whichever trigger wins below.
  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    const win = iframe.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
    setTimeout(() => iframe.remove(), 1000);
  };

  // srcdoc fires `load` only once the document AND its images (the logo) have
  // finished loading, so the print captures a fully rendered page. We add a
  // small delay for final layout, plus a safety net in case load never fires.
  iframe.srcdoc = html;
  iframe.onload = () => setTimeout(triggerPrint, 100);
  setTimeout(triggerPrint, 2000);

  document.body.appendChild(iframe);
}

// ── Invoices list ─────────────────────────────────────────────────────────────
export function Invoices() {
  const { invoices, updateInvoice, voidInvoice, settings } = useSupabaseData();
  const { user } = useSupabaseAuth();
  const isAdmin = user?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(
      inv =>
        (inv.invoiceNumber || '').toLowerCase().includes(term) ||
        inv.id.toLowerCase().includes(term) ||
        inv.createdBy.toLowerCase().includes(term) ||
        (inv.customerName || '').toLowerCase().includes(term) ||
        inv.items.some(item => item.productName.toLowerCase().includes(term))
    );
  }, [invoices, searchTerm]);

  const togglePaid = (invoice: Invoice) => {
    updateInvoice(invoice.id, { paid: !invoice.paid });
  };

  const handleVoid = async (invoice: Invoice) => {
    const label = invoice.invoiceNumber || invoice.id;
    if (!confirm(`Void invoice ${label}? It will be permanently marked VOID and can no longer be edited, but stays on record and can still be viewed and printed.`)) {
      return;
    }
    setVoidingId(invoice.id);
    const { success, error } = await voidInvoice(invoice.id);
    setVoidingId(null);
    if (success) {
      toast.success(`Invoice ${label} voided`);
    } else {
      toast.error(error || 'Failed to void invoice');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2">Invoices</h1>
        <p className="text-gray-600">{invoices.length} total invoices</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by invoice #, user, or product..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-gray-700">Invoice #</th>
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
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{invoice.invoiceNumber || invoice.id}</td>
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
                    {invoice.voided ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs gap-1 bg-red-100 text-red-800">
                        <Ban className="w-3 h-3" />
                        Void
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs gap-1 ${
                        invoice.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.paid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {invoice.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    )}
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
                      {isAdmin && !invoice.voided && (
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
                      )}
                      {isAdmin && !invoice.voided && (
                        <Button
                          onClick={() => handleVoid(invoice)}
                          disabled={voidingId === invoice.id}
                          variant="ghost" size="sm"
                          className="p-2 text-red-600 hover:bg-red-50"
                          title="Void invoice"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredInvoices.map(invoice => (
            <div key={invoice.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-gray-900 truncate">{invoice.invoiceNumber || invoice.id}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{invoice.customerName || 'Walk-in'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(invoice.date), 'MMM d, yyyy')} • {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-gray-900">${invoice.total.toFixed(2)}</p>
                  {invoice.voided ? (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs gap-1 bg-red-100 text-red-800">
                      <Ban className="w-3 h-3" />
                      Void
                    </span>
                  ) : (
                    <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs gap-1 ${
                      invoice.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.paid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {invoice.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3">
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
                {isAdmin && !invoice.voided && (
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
                )}
                {isAdmin && !invoice.voided && (
                  <Button
                    onClick={() => handleVoid(invoice)}
                    disabled={voidingId === invoice.id}
                    variant="ghost" size="sm"
                    className="p-2 text-red-600 hover:bg-red-50"
                    title="Void invoice"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
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
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-mono text-sm">{invoice.invoiceNumber || invoice.id}</span>
            {invoice.voided ? (
              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Void</span>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded ${invoice.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {invoice.paid ? 'Paid' : 'Unpaid'}
              </span>
            )}
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
        <div className="p-4 sm:p-8 relative">
          {invoice.voided && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-20">
              <span
                className="text-red-600/20 border-[6px] border-red-600/20 rounded-2xl px-10 py-2 font-extrabold tracking-[0.2em] whitespace-nowrap"
                style={{ fontSize: '90px', transform: 'rotate(-32deg)' }}
              >
                VOID
              </span>
            </div>
          )}
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 mb-6 border-b-4 border-yellow-500">
            <div>
              <p className="text-2xl text-gray-900">{settings.businessName}</p>
              <p className="text-sm text-gray-600 mt-1">{settings.businessAddress}</p>
              <p className="text-sm text-gray-600">Tel: {settings.businessPhone}</p>
              {settings.businessTagline && <p className="text-xs text-gray-500 italic mt-1">{settings.businessTagline}</p>}
            </div>
            <div className="text-right ml-auto">
              <div className="inline-block bg-yellow-500 text-white px-5 py-2 rounded-lg mb-3">
                <span className="text-lg tracking-widest">INVOICE</span>
              </div>
              <p className="text-xs text-gray-500">Invoice #: <span className="text-gray-900">{invoice.invoiceNumber || invoice.id}</span></p>
              <p className="text-xs text-gray-500">Date: <span className="text-gray-900">{format(new Date(invoice.date), 'MMMM d, yyyy')}</span></p>
              <p className="text-xs text-gray-500">By: <span className="text-gray-900">{invoice.createdBy}</span></p>
            </div>
          </div>

          {/* Bill to / status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
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
          <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-4 py-2.5 rounded-tl whitespace-nowrap">Description</th>
                <th className="text-center px-4 py-2.5 whitespace-nowrap">Qty</th>
                <th className="text-right px-4 py-2.5 whitespace-nowrap">Unit Price</th>
                <th className="text-right px-4 py-2.5 rounded-tr whitespace-nowrap">Amount</th>
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
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-64 space-y-2 text-sm">
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
