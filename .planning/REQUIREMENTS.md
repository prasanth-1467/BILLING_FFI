# Requirements: Milestone 1 — Modern CRM & UI/UX Transformation

## User Objectives
1. Improve the existing frontend UI/UX.
2. Build a professional CRM dashboard.
3. Improve customer management with 360° visibility.
4. Introduce CRM capabilities progressively (interaction history, quotation pipeline, aging).
5. Preserve existing billing, GST, inventory, and PDF generation functionality.

---

## Scoped Requirements

### 1. System Invariants & Preservation (SYS)
- **SYS-01**: All existing GST tax logic (CGST, SGST, IGST, multi-slab, round-off) must remain 100% backward-compatible.
- **SYS-02**: All PDFKit document generators for Invoices, Quotations, and Purchase Orders must render identically with zero formatting regressions.
- **SYS-03**: Existing background cron agents (`AgentRunner.js`) must continue running reliably without schema conflicts.

### 2. UI/UX Foundation & Modernization (UI)
- **UI-01**: Modernize dashboard, navigation sidebar, and action headers with polished Tailwind typography, consistent spacing, and dark/light system accents.
- **UI-02**: Ensure high-contrast, responsive data tables with sticky actions, search filtering, and clear state indicators (loading, empty, error).
- **UI-03**: Integrate persistent state filters across list views without UI flickering or lag.

### 3. Customer 360 & Management (CUST)
- **CUST-01**: Expand Customer model additively (optional email, credit limit, payment terms, lifecycle stage, notes).
- **CUST-02**: Create Customer 360 view displaying aggregated lifetime value, total invoiced, total pending balance, and average payment turnaround.
- **CUST-03**: Embedded customer transaction ledger displaying chronological invoices, quotations, and payment history.
- **CUST-04**: Fast WhatsApp/Phone quick-actions for follow-ups and payment requests.

### 4. Executive CRM Dashboard (DASH)
- **DASH-01**: Executive KPI cards: Revenue this month, Total Receivables, Receivables Aging (>30 days, >60 days), and Active Quotation Pipeline Value.
- **DASH-02**: Aging Receivables Breakdown chart with drill-down into critical overdue accounts.
- **DASH-03**: Quotation Conversion Funnel (Draft → Sent → Approved → Invoiced).
- **DASH-04**: Live Agent Notification Center displaying proactive alerts from `InsightAgent`, `InvoicerAgent`, and `RestockAgent`.

### 5. Progressive CRM Capabilities (CRM)
- **CRM-01**: Customer interaction logging (record phone calls, site visits, or WhatsApp interactions with follow-up dates).
- **CRM-02**: Invoicer agent integration to surface actionable quotation-to-invoice conversions directly on customer and quotation pages.

