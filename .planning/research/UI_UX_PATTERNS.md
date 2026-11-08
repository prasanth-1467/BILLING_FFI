# Research: Modern UI/UX Patterns for ERP & CRM

## 1. Dashboard Layout Best Practices
- **Top Metric Cards**: Financial health at a glance (Revenue this month, Receivables Aging, Active Quotes in Pipeline, Low Stock Alerts) with trend indicators.
- **Visual Charting**:
  - Recharts Area/Bar hybrid for Cash Inflow vs Pending Balances over 30/60/90 days.
  - Funnel or Status Ring for Quotation Conversion Rate.
- **Actionable Widget Row**:
  - Urgent Receivables Table: Top 5 overdue accounts with one-click reminder action.
  - Quick Conversion: Quotations ready for invoice generation (from `InvoicerAgent`).
  - Agent Alerts feed with priority badges (High/Medium/Low).

## 2. Customer Management UI
- **Customer List Page**:
  - High-density table with fast search, segment pills (`Farmer`, `Dealer`, etc.), outstanding amount badge, and status indicator.
  - Inline quick-actions: View 360, Create Invoice, Create Quote, Record Payment.
- **Customer 360 Drawer/Modal/Page**:
  - Left pane: Contact details, GSTIN validation badge, credit terms, notes.
  - Right pane: Tabbed view:
    - Tab 1: Ledger / Invoices (Total billed, Total paid, Balance due).
    - Tab 2: Quotations & Pipeline.
    - Tab 3: Interaction History & Notes.

## 3. Design System & Theme Consistency
- Align with Tailwind palette: Slate/Zinc neutral bases with Emerald/Indigo/Sky accents for financial statuses (Paid: Emerald, Pending: Amber, Overdue: Rose).
- Responsive grid: Auto-collapsing metrics cards on mobile, horizontal scrolling data tables with sticky action columns.

