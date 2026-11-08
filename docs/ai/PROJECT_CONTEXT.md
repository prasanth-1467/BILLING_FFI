# Project Context: Fine Flow Irrigation (FFI) Billing & CRM

**Name**: Fine Flow Irrigation Billing & CRM System  
**One-liner**: Full-stack GST billing, purchase management, and CRM application for Fine Flow Irrigation.  
**Platform**: Web (React + Express + MongoDB)

## Problem and Users
- **Problem**: Managing GST-compliant sales, quotations, purchase orders, customer ledgers, and inventory for an agricultural and industrial irrigation equipment business.
- **Users**: Business owners, sales staff, accountants, and inventory managers.
- **Customer Personas**: Farmers, Equipment Dealers, Contractors, and Institutional clients.

## Core Functionality
- **Sales & Billing**: GST Tax Invoices (CGST/SGST/IGST, multi-slab, round-off, automatic numbering `FFI/25-26/XXX`), Quotations & Conversion to Invoices, PDFKit document export.
- **Purchase Management**: Supplier tracking, Purchase Orders with supplier model numbers, PDF generation.
- **Master Data**: Customers with category tags, Products with HSN codes & stock tracking, Suppliers.
- **Background Intelligence**: Automated cron agents (`InsightAgent`, `RestockAgent`, `InvoicerAgent`) generating proactive notifications.
- **CRM Integration (Active Milestone)**: Modern UI/UX, Executive Dashboard with Receivables Aging, Customer 360 & Ledger, and interaction follow-ups.

## Constraints & Invariants
- **Non-breaking**: Existing GST calculation logic, database schemas, and PDF generators must remain 100% operational.
- **Additive**: All schema and route enhancements must be non-breaking and additive.
- **Token Efficiency**: Compact documentation; reference docs rather than duplicating content across files.

## Current Status
- Milestone 1 initialized in `.planning/`.
- Ready for Phase 1 planning (`/gsd-plan-phase 1`).
