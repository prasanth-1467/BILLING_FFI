# Project: Fine Flow Irrigation (FFI) Billing & CRM System

## Context & Background
This is an existing, operational GST Billing and Purchase Management system built for Fine Flow Irrigation. It manages Indian GST compliance (intra-state CGST+SGST, inter-state IGST), Quotations, Invoices, Purchase Orders, Suppliers, and Master Product data with automated background cron agents for insights and alerts.

**Crucial Constraint**: This is NOT a greenfield project. All existing backend APIs, database models, GST calculation algorithms, PDF generation (PDFKit), and background cron agents must remain operational and backward-compatible.

## Core Objectives
1. **Improve Frontend UI/UX**: Elevate the visual design, ergonomics, and responsiveness of the dashboard, lists, and forms using modern Tailwind CSS patterns, intuitive navigation, and consistent state handling.
2. **Build a Professional CRM Dashboard**: Transform the existing dashboard into a unified business command center combining real-time revenue KPIs, receivables aging, quotation conversion pipelines, and active AI agent notifications.
3. **Elevate Customer Management**: Upgrade customer records from flat address-book entries into a 360° customer profile including transaction history (invoices & quotations), outstanding balance ledgers, and contact information.
4. **Progressive CRM Capabilities**: Introduce customer lifecycle tracking (Farmer, Dealer, Contractor, Institution), interaction logs, follow-up reminders, and quotation lifecycle tracking.
5. **Preserve Core Business Workflows**: Zero regressions to existing GST invoicing, quotation-to-invoice conversion, PDFKit document generation, and stock management.

## Tech Stack Baseline
- **Frontend**: Vite + React 18, Tailwind CSS, Lucide React, Recharts, React Router v6.
- **Backend**: Node.js + Express.js, MongoDB via Mongoose, JWT authentication, PDFKit, node-cron.
- **Background Cron Agents**: `InsightAgent`, `RestockAgent`, `InvoicerAgent` coordinated by `AgentRunner`.

