GST Billing & Purchase Management System

A full-stack web application built to manage GST billing, quotations, invoices, purchase orders, customers, and suppliers for Fine Flow Irrigation.

This system is designed for real-world business usage with clean workflows and professional printable documents.

🚀 Features
📄 Sales & Billing

Create GST Tax Invoices

Generate Customer Quotations

Convert Quotations → Invoices

Automatic Invoice Numbering
FFI/25-26/001 format

Supports:

CGST + SGST (Intra-state – Tamil Nadu)

IGST (Inter-state)

Multi-GST slab calculation in a single bill

Optional Discount (hidden if not used)

Round-Off (R/O) support

🧾 Purchase Management

Dedicated Purchase Order Module

Supplier management

Manual model number entry (as provided by supplier)

Structured PO numbering

Printable Purchase Order PDF

Purchase-oriented Terms & Conditions

📦 Master Data Management

Product catalog with:

HSN Code

GST %

Units & Pricing

Customer database

Supplier database with validation

🖨️ Professional Document Generation

Generates:

Quotations

Tax Invoices

Purchase Orders

Clean layout with dynamic row height (no text overlap)

Company branding & bank details included

Optional digital signature toggle before download

🏗️ Tech Stack
Layer	Technology
Frontend	React + Vite + Tailwind CSS
Server	Node.js + Express.js
Database	MongoDB
PDF Engine	PDFKit
Deployment	Vercel + Render
⚙️ Environment Configuration

Create environment variables before running.

Example:
MONGO_URI=your_database_connection
JWT_SECRET=your_secret_key
PORT=5000

Frontend should point to the deployed API:

VITE_API_URL=https://your-service-url/api
🧪 Running Locally

Install dependencies and start services.

npm install
npm run dev

Application will be available at:

http://localhost:5173
🌐 Deployment Overview

Frontend hosted on Vercel

API service hosted on Render

Database hosted on MongoDB Atlas

Any push to the repository automatically triggers redeployment.

📊 Business Logic Highlights

✔ Handles mixed GST slabs correctly
✔ Designed for irrigation equipment workflow
✔ Separates sales cycle and purchasing cycle
✔ Clean printable formats for real-world use
✔ Extendable for stock tracking and GST reporting

🔮 Planned Enhancements

Stock Ledger & Purchase Tracking

GST Filing Reports

Payment Tracking

Analytics Dashboard

Multi-user access control

👨‍💼 Developed For

Fine Flow Irrigation
Pollachi, Tamil Nadu

Digitizing billing, purchasing, and documentation workflows.

📜 Usage

This project is intended for operational business use and internal customization.

End of Document
