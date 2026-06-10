const fs = require("fs");
const path = require("path");
const { generatePDF } = require("../utils/pdfGenerator");
const { generatePoPDF } = require("../utils/poPdfGenerator");
const themeConfig = require("../config/themeConfig");

// Create mock data for an invoice/quotation with 22 items to trigger multiple page breaks
const mockInvoiceData = {
  number: "FFI/26-27/099",
  date: new Date(),
  paymentTerms: "Immediate Payment",
  customer: {
    name: "Supreme Farms & Industries Ltd",
    address: "SF-401, Agricultural Tech Park, Bypass Road, Coimbatore, Tamil Nadu, 641003",
    gst: "33AAACS9988A1Z9",
    phone: "9894012345",
    state: "Tamil Nadu",
    shipTo: {
      name: "Supreme Farms (Warehouse 2)",
      address: "Survey No. 110/4, Avinashi Road, Neelambur, Coimbatore, Tamil Nadu, 641062",
      city: "Coimbatore",
      state: "Tamil Nadu",
      phone: "9894098765"
    }
  },
  items: Array.from({ length: 22 }, (_, idx) => ({
    name: `High-Performance Drip Irrigation Pipe Segment Model-X${idx + 1} with custom flow regulators and pressure control nozzles`,
    hsn: "8424",
    gstRate: 18,
    qty: idx + 1,
    unit: "Nos",
    rate: 150 + idx * 10,
    amount: (idx + 1) * (150 + idx * 10)
  })),
  subtotal: 0,
  discountPercent: 10,
  taxableAmount: 0,
  gst: {
    CGST: 0,
    SGST: 0,
    IGST: 0
  },
  roundOff: 0.2,
  total: 0,
  includeSignature: true,
  includeSeal: true
};

// Calculate totals for mock data
mockInvoiceData.subtotal = mockInvoiceData.items.reduce((sum, item) => sum + item.amount, 0);
const discAmount = (mockInvoiceData.subtotal * mockInvoiceData.discountPercent) / 100;
mockInvoiceData.taxableAmount = mockInvoiceData.subtotal - discAmount;
const taxTotal = (mockInvoiceData.taxableAmount * 0.18);
mockInvoiceData.gst.CGST = taxTotal / 2;
mockInvoiceData.gst.SGST = taxTotal / 2;
mockInvoiceData.total = Math.round(mockInvoiceData.taxableAmount + taxTotal + mockInvoiceData.roundOff);

// Mock PO Data
const mockPoData = {
  poNumber: "PO-FFI-26-27-099",
  date: new Date(),
  expectedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  supplier: {
    name: "Classic Agro Irrigation Spares & Co",
    address: "42, Industrial Estate Phase II, Guindy, Chennai, Tamil Nadu, 600032",
    gstin: "33AAACC1234F1Z8",
    phone: "044-22501234"
  },
  items: Array.from({ length: 22 }, (_, idx) => ({
    name: `Premium Brass Sprinkler Head Type-B${idx + 1} Heavy Duty`,
    modelNo: `MSH-B${idx + 1}`,
    gstRate: 18,
    qty: idx + 2,
    unit: "Nos",
    rate: 85.5 + idx * 5,
    amount: (idx + 2) * (85.5 + idx * 5)
  })),
  includeSignature: true,
  includeSeal: true
};

async function testThemeGeneration() {
  console.log("Generating PDFs for theme overflow tests...");

  const scratchDir = __dirname;
  
  for (const [themeKey, theme] of Object.entries(themeConfig)) {
    console.log(`\nTesting theme: ${theme.name} (${themeKey})`);

    // 1. Generate Invoice PDF
    const invPdfPath = path.join(scratchDir, `test_invoice_${themeKey}.pdf`);
    const invWriteStream = fs.createWriteStream(invPdfPath);
    const invoiceThemeData = { ...mockInvoiceData, theme };
    
    await generatePDF(invWriteStream, invoiceThemeData, "TAX INVOICE");
    console.log(`- Saved Invoice PDF: ${invPdfPath}`);

    // 2. Generate PO PDF
    const poPdfPath = path.join(scratchDir, `test_po_${themeKey}.pdf`);
    const poWriteStream = fs.createWriteStream(poPdfPath);
    const poThemeData = { ...mockPoData, theme };
    
    // generatePoPDF pipes internally and ends, so we wait for write finish
    generatePoPDF(poWriteStream, poThemeData);
    
    await new Promise((resolve) => poWriteStream.on("finish", resolve));
    console.log(`- Saved PO PDF: ${poPdfPath}`);
  }

  console.log("\n✅ Generation complete. All files saved to scratch folder.");
}

testThemeGeneration().catch(err => {
  console.error("Test execution failed:", err);
});
