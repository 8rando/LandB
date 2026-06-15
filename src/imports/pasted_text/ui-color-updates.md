# Plan: Yellow Overhaul, Logo Swap, Cashier Permissions, Invoice PDF Fix

## Context

The user has uploaded their real company logo (`src/imports/lb-logo.png` — L & B Limited construction/equipment badge in yellow and dark charcoal). Four changes are requested:

1. **Yellow accent overhaul** — replace indigo/purple accent colors across the entire UI with yellow (matching the logo's dominant yellow/gold palette)
2. **Logo icon swap** — replace the placeholder Gauge icon in the sidebar and login page with the actual lb-logo.png; also embed it in invoice PDFs
3. **Cashier add-items access** — cashiers should be able to navigate to Inventory and add new items, but not edit or delete existing ones
4. **Invoice PDF fix** — the current print-to-PDF renders the full app page instead of just the invoice; fix so only the invoice document is printed and it renders in full

---

## 1. Yellow Accent Overhaul

### Color mapping (Tailwind classes)

| Old                             | New                             | Usage                               |
| ------------------------------- | ------------------------------- | ----------------------------------- |
| `indigo-600`                    | `yellow-500`                    | Primary buttons, active nav, badges |
| `indigo-700`                    | `yellow-600`                    | Button hover states                 |
| `indigo-50`                     | `yellow-50`                     | Light backgrounds, active nav bg    |
| `indigo-100`                    | `yellow-100`                    | Avatar bg, subtle fills             |
| `indigo-400`                    | `yellow-400`                    | Lighter accents                     |
| `indigo-300`                    | `yellow-300`                    | Very light accents                  |
| `indigo-500`                    | `yellow-500`                    | Focus rings                         |
| `text-indigo-600/700/800`       | `text-yellow-600/700/800`       | Text accents                        |
| `purple-600`                    | `yellow-600`                    | Was gradient end-stop               |
| `from-indigo-600 to-purple-600` | `from-yellow-500 to-yellow-600` | Sidebar/login logo container        |
| `from-blue-50 to-indigo-100`    | `from-yellow-50 to-amber-50`    | Login page background               |

**Item type badge remapping** (avoid conflict with yellow primary):

| Type          | Old                                 | New                             |
| ------------- | ----------------------------------- | ------------------------------- |
| Non-Inventory | `bg-purple-100 text-purple-700/800` | `bg-slate-100 text-slate-700`   |
| Bundle        | `bg-yellow-100 text-yellow-700/800` | `bg-orange-100 text-orange-800` |
| Inventory     | `bg-blue-100 text-blue-700/800`     | keep                            |
| Service       | `bg-green-100 text-green-700/800`   | keep                            |
| Other         | `bg-gray-100 text-gray-600/700`     | keep                            |

**Invoice print HTML hex colors** (hardcoded strings inside the `printInvoice` template literal):

- `#4f46e5` → `#eab308` (yellow-500)
- `#4338ca` → `#ca8a04` (yellow-600)
- `#eef2ff` → `#fefce8` (yellow-50)
- `#4338ca` (grand total text) → `#854d0e` (yellow-800 for readability on light bg)

### Files to update

- `src/app/components/ui/Button.tsx` — primary variant bg/hover colors
- `src/app/components/ui/Input.tsx` — focus ring color
- `src/app/components/Layout.tsx` — active nav states, avatar bg/text, logo gradient
- `src/app/components/Login.tsx` — page bg gradient, logo gradient
- `src/app/components/Dashboard.tsx` — hover border on profit card, icon bg/text
- `src/app/components/Inventory.tsx` — tags, active type filters, focus rings, item type badge map
- `src/app/components/Checkout.tsx` — active filter buttons, price-edit focus, tag buttons, item type badge map
- `src/app/components/BulkUpload.tsx` — stepper active step, drag-over state, icons, item type badge map
- `src/app/components/Settings.tsx` — selected sidebar card border/bg, checkmark dot
- `src/app/components/Invoices.tsx` — header border, INVOICE badge bg, totals box, **+ hex colors in print HTML**

---

## 2. Logo Swap (Sidebar, Login, Invoice PDF)

### Import

In each file that needs the logo:

```ts
import lbLogo from "../../imports/lb-logo.png";
// (adjust relative path per file location)
```

### Layout.tsx — sidebar header

Replace the `<div className="w-10 h-10 bg-gradient-to-br from-... rounded-xl ..."><Gauge /></div>` container with:

```tsx
<img
  src={lbLogo}
  alt="L & B Limited"
  className="w-10 h-10 object-contain rounded-lg flex-shrink-0"
/>
```

Remove the `Gauge` lucide import from this file.

### Login.tsx — login card

Replace the `<div className="w-16 h-16 bg-gradient-to-br from-... rounded-2xl ..."><Gauge /></div>` with:

```tsx
<img
  src={lbLogo}
  alt="L & B Limited"
  className="w-20 h-20 object-contain"
/>
```

Remove the `Gauge` lucide import from this file.

### Invoices.tsx — invoice PDF header

In the `printInvoice` function, add the logo to the HTML header section. Since the print window is a new blank popup, image src must be absolute:

```ts
import lbLogo from "../../imports/lb-logo.png";
// Inside printInvoice:
const logoUrl = window.location.origin + lbLogo;
// In the HTML string:
`<img src="${logoUrl}" alt="L & B Logo" style="width:80px;height:80px;object-fit:contain">`;
```

Place this in the company header section of the invoice HTML, left-aligned next to the company name text.

---

## 3. Cashier Add-Items Access

### routes.tsx

Change line 35 from `allowedRoles={['admin']}` to `allowedRoles={['admin', 'cashier']}` for the `/inventory` route.

### Layout.tsx — NAV_ITEMS

Change the inventory entry's `roles` from `['admin']` to `['admin', 'cashier']` so the nav link appears for cashiers.

### Inventory.tsx — component-level role gating

Cashiers can **add** items but not **edit** or **delete**. Wrap Edit/Delete controls:

```tsx
const { user } = useAuth(); // already imported

// In the table actions cell — wrap both buttons:
{user?.role === 'admin' && (
  <>
    <Button onClick={() => handleEdit(product)} ...><Edit2 /></Button>
    <Button onClick={() => handleDelete(product)} ...><Trash2 /></Button>
  </>
)}
```

The "Add Item" button at the top stays visible to all roles. No change to the `ItemModal` — it handles both add and edit and cashiers will only ever open it in add mode.

---

## 4. Invoice PDF Fix

### Root cause

`window.print()` inside a `window.open()` popup fires via `window.onload` but:

- Images may not have loaded yet, causing blank logo
- The popup content is correct HTML but some browsers clip content at the first viewport height rather than paginating the full document

### Fix — use a hidden `<iframe>` instead of `window.open()`

Replace the popup approach with an in-page `<iframe>`:

```ts
function printInvoice(invoice: Invoice, settings: Settings) {
  const html = buildInvoiceHtml(invoice, settings); // same HTML generation logic

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for images to load before triggering print
  iframe.onload = () => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    // Remove iframe after short delay to allow print dialog
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}
```

This approach:

- No popup blocker issues (same DOM)
- Same origin so images load correctly using relative paths (no need for `window.location.origin`)
- `iframe.onload` fires only after all resources (including logo image) are loaded
- Full document height is available for print pagination

The invoice HTML itself stays the same structure but gets the yellow color updates and the logo `<img>` tag added to the header.

---

## Verification

1. **Login page** — should show lb-logo.png, yellow/amber background gradient, yellow Sign In button
2. **Sidebar** — lb-logo.png in top-left; active nav items highlight in yellow; hover tooltips appear in yellow-accented style
3. **Cashier login** (`cashier` / `cashier123`) — Inventory link appears in nav; can open Add Item modal; Edit/Delete buttons are hidden
4. **Admin login** — Edit/Delete still visible; all other admin routes still gated
5. **Invoice list** → Print icon → browser print dialog opens showing only the A4 invoice document with logo, yellow header border, yellow total box, and no app chrome
6. **Bulk upload, Checkout, Settings** — all interactive yellow accents (buttons, filter pills, step indicators, drag states)