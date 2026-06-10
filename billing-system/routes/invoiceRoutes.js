const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const Counter = require("../models/Counter"); // Added Counter import
const { generatePDF } = require("../utils/pdfGenerator");
const { sendEmailWithAttachment } = require("../utils/emailService");

// CREATE DIRECT INVOICE
router.post("/", async (req, res) => {
  try {
    const { 
      invoiceNumber,
      customerId, 
      customerName, 
      customerGSTIN, 
      customerAddress, 
      customerState, 
      customerPhone,
      items, 
      discountPercent, 
      paymentType, 
      paidAmount,
      date,
      dueDate,
      shipTo 
    } = req.body;

    const invoiceDate = date ? new Date(date) : new Date();

    // 1. Process Items (Reduce stock if productId is defined, format details)
    let enrichedItems = [];
    for (let item of items) {
      // If productId is provided, look it up in database to ensure details are populated and stock is adjusted
      let dbProduct = null;
      if (item.productId) {
        dbProduct = await Product.findById(item.productId);
        if (dbProduct) {
          // Adjust stock quantity
          dbProduct.stockQty = (dbProduct.stockQty || 0) - item.qty;
          await dbProduct.save();
        }
      }

      enrichedItems.push({
        productId: item.productId || null,
        name: item.name || (dbProduct ? dbProduct.name : "Custom Product"),
        hsn: item.hsn || (dbProduct ? dbProduct.hsn : "-"),
        unit: item.unit || (dbProduct ? dbProduct.unit : "Nos"),
        qty: Number(item.qty),
        rate: Number(item.rate),
        gstRate: Number(item.gstRate || 0),
        amount: Number(item.qty) * Number(item.rate)
      });
    }

    // 2. Determine State Type for Tax Splits
    // Read state from either cataloged customer or manual entry
    let finalState = customerState || "Tamil Nadu";
    if (customerId) {
      const Customer = require("../models/Customer");
      const dbCustomer = await Customer.findById(customerId);
      if (dbCustomer) {
        finalState = dbCustomer.state;
      }
    }

    const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");
    const isIntraState = normalize(finalState) === "tamilnadu";

    // 3. Calculate Totals using taxCalculator Utility
    const { calculateGST, calculateFinal } = require("../utils/taxCalculator");
    const calcInitial = calculateGST(enrichedItems, finalState);
    const results = calculateFinal(calcInitial.subtotal, Number(discountPercent || 0), enrichedItems, isIntraState);

    const { subtotal, taxableAmount, gstBreakup, roundOff, total } = results;

    // 4. Handle Invoice Number (Mandatory)
    let finalInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : null;
    if (!finalInvoiceNumber) {
      return res.status(404).json({ error: "Invoice number is mandatory" });
    }

    // Format invoice number to FFI/YY-YY/number if they typed just a number or partial string
    const invoiceYear = invoiceDate.getFullYear();
    const invoiceMonth = invoiceDate.getMonth(); // 0-11
    const invoiceStartYear = invoiceMonth >= 3 ? invoiceYear : invoiceYear - 1;
    const fyString = `${String(invoiceStartYear).slice(-2)}-${String(invoiceStartYear + 1).slice(-2)}`;

    if (!finalInvoiceNumber.toUpperCase().startsWith("FFI/")) {
      let numPart = finalInvoiceNumber;
      if (/^\d+$/.test(numPart)) {
        numPart = String(numPart).padStart(3, '0');
      }
      finalInvoiceNumber = `FFI/${fyString}/${numPart}`;
    }

    // Uniqueness check for manual invoiceNumber
    const existing = await Invoice.findOne({ invoiceNumber: finalInvoiceNumber });
    if (existing) {
      return res.status(400).json({ error: `Invoice number "${finalInvoiceNumber}" already exists` });
    }

    const calculatedPaidAmount = Number(paidAmount || 0);
    const balance = total - calculatedPaidAmount;

    // 5. Create new Invoice Document
    const invoice = new Invoice({
      invoiceNumber: finalInvoiceNumber,
      customerId: customerId || null,
      
      // Manual columns (will be saved cleanly)
      customerName: customerName || null,
      customerGSTIN: customerGSTIN || null,
      customerAddress: customerAddress || null,
      customerState: customerState || null,
      customerPhone: customerPhone || null,
      
      items: enrichedItems,
      subtotal,
      discountPercent: Number(discountPercent || 0),
      taxableAmount,
      gstBreakup,
      roundOff,
      total,
      paymentType: paymentType || "Cash",
      paymentTerms: "Due on Receipt",
      dueDate: dueDate ? new Date(dueDate) : invoiceDate,
      date: invoiceDate,
      paidAmount: calculatedPaidAmount,
      balance,
      status: balance <= 0 ? "Paid" : (calculatedPaidAmount > 0 ? "Partially Paid" : "Pending"),
      theme: req.body.theme || null,
      shipTo: shipTo || null
    });

    await invoice.save();
    res.json(invoice);

  } catch (err) {
    console.error("Direct Invoice Creation Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// UPDATE INVOICE DETAILS (Number, etc.)
router.patch("/:id", async (req, res) => {
  try {
    const { invoiceNumber } = req.body;

    // Uniqueness check for invoiceNumber
    if (invoiceNumber) {
      const existing = await Invoice.findOne({ invoiceNumber });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ error: "Invoice number already exists" });
      }
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // Allow updating other fields if needed, but primarily invoiceNumber
      { new: true }
    );

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE INVOICE STATUS
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE INVOICE
router.delete("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convert quotation to invoice
router.post("/from-quotation/:quoteId", async (req, res) => {
  try {
    const { paymentType, paidAmount } = req.body;

    const quote = await Quotation.findById(req.params.quoteId);
    if (!quote) return res.status(404).json({ error: "Quotation not found" });

    if (quote.status === "Converted")
      return res.status(400).json({ error: "Already converted" });

    // Reduce stock
    console.log("Processing stock reduction...");
    for (let item of quote.items) {
      console.log(`Checking product ${item.productId}`);
      const product = await Product.findById(item.productId);
      if (product) {
        console.log(`Updating stock for ${product.name}. Old: ${product.stockQty}, Reduce by: ${item.qty}`);
        product.stockQty = (product.stockQty || 0) - item.qty;
        await product.save();
        console.log("Product saved.");
      } else {
        console.warn(`Product ${item.productId} not found during conversion!`);
      }
    }

    const balance = quote.total - paidAmount;

    console.log("Creating invoice object...");

    // Generate Sequential Invoice Number
    const counter = await Counter.findOneAndUpdate(
      { id: "invoiceNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const startYear = month >= 3 ? year : year - 1;
    const fyString = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;

    const invoiceNumber = `FFI/${fyString}/${String(counter.seq).padStart(3, '0')}`;

    const invoice = new Invoice({
      invoiceNumber,
      customerId: quote.customerId,
      items: quote.items,
      subtotal: quote.subtotal,
      discountPercent: quote.discountPercent,
      taxableAmount: quote.taxableAmount,
      gstBreakup: quote.gstBreakup,
      roundOff: quote.roundOff,
      total: quote.total,
      paymentType,
      paidAmount,
      balance,
      dueDate: date,
      paymentTerms: "Due on Receipt",
      status: balance <= 0 ? "Paid" : (paidAmount > 0 ? "Partially Paid" : "Pending"),
      theme: quote.theme || null,
      shipTo: quote.shipTo // Copy shipTo from quotation
    });

    console.log("Saving invoice...");
    await invoice.save();
    console.log("Invoice saved.");

    quote.status = "Converted";
    await quote.save();

    res.json(invoice);

  } catch (err) {
    console.error("CONVERSION ERROR:", err);
    res.status(400).json({ error: err.message, stack: err.stack });
  }
});
// Get single invoice
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customerId")
      .populate("items.productId");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices
router.get("/", async (req, res) => {
  const invoices = await Invoice.find()
    .populate("customerId")
    .sort({ invoiceNumber: 1 });
  res.json(invoices);
});

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Customer = require("../models/Customer");

// PDF Generation Route
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerId')
      .populate('items.productId'); // If you have product refs

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const includeSignature = req.query.includeSignature === 'true';
    const includeSeal = req.query.includeSeal === 'true';

    // Resolve theme
    const BusinessSettings = require("../models/BusinessSettings");
    const themeConfig = require("../config/themeConfig");
    let resolvedThemeName = req.query.theme || invoice.theme;
    if (!resolvedThemeName) {
      const settings = await BusinessSettings.findOne();
      resolvedThemeName = settings?.defaultTheme || "indigo";
    }
    const theme = themeConfig[resolvedThemeName] || themeConfig.indigo;

    // Construct Data Object for PDF
    const pdfData = {
      number: invoice.invoiceNumber,
      theme,
      date: invoice.date,
      paymentTerms: "Immediate", // You can make this dynamic if added to model
      customer: {
        name: invoice.customerName || invoice.customerId?.name || "-",
        address: invoice.customerAddress || invoice.customerId?.address || "-",
        gst: invoice.customerGSTIN || invoice.customerId?.gstNumber || "URD",
        phone: invoice.customerPhone || invoice.customerId?.phone || "-",
        state: invoice.customerState || invoice.customerId?.state || "-", // Pass State
        shipTo: invoice.shipTo // Pass shipTo
      },
      items: invoice.items.map(item => ({
        name: item.name || item.productId?.name || "Unknown Product",
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        hsn: item.hsn || item.productId?.hsn || "",
        gstRate: item.gstRate,
        unit: item.unit || item.productId?.unit || ""
      })),
      subtotal: invoice.subtotal,
      discountPercent: invoice.discountPercent,
      discount: (invoice.subtotal * (invoice.discountPercent || 0)) / 100,
      taxableAmount: invoice.taxableAmount,
      gst: invoice.gstBreakup,
      roundOff: invoice.roundOff,
      total: invoice.total,
      includeSignature, // Add to data object
      includeSeal
    };


    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);

    generatePDF(res, pdfData, "TAX INVOICE");

  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});


// PATCH /api/invoices/:id/payment - Record Payment
router.patch("/:id/payment", async (req, res) => {
  try {
    const { amount } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const newPaidAmount = (invoice.paidAmount || 0) + Number(amount);
    const newBalance = invoice.total - newPaidAmount;

    let newStatus = "Pending";
    if (newBalance <= 0) {
      newStatus = "Paid";
    } else if (newPaidAmount > 0) {
      newStatus = "Partially Paid";
    } else {
      if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
        newStatus = "Overdue";
      }
    }

    invoice.paidAmount = newPaidAmount;
    invoice.balance = newBalance;
    invoice.status = newStatus;

    await invoice.save();
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email Invoice to Admin
router.post("/:id/email-to-me", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customerId")
      .populate("items.productId");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const pdfData = {
      number: invoice.invoiceNumber,
      date: invoice.date,
      paymentTerms: "Due on Receipt",
      customer: {
        name: invoice.customerName || invoice.customerId?.name || "-",
        address: invoice.customerAddress || invoice.customerId?.address || "-",
        gst: invoice.customerGSTIN || invoice.customerId?.gstNumber || "URD",
        phone: invoice.customerPhone || invoice.customerId?.phone || "-",
        state: invoice.customerState || invoice.customerId?.state || "-",
        shipTo: invoice.shipTo
      },
      items: invoice.items.map(item => ({
        name: item.name || item.productId?.name || "Product",
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        hsn: item.hsn || item.productId?.hsn || "",
        gstRate: item.gstRate,
        unit: item.unit || item.productId?.unit || ""
      })),
      subtotal: invoice.subtotal,
      discountPercent: invoice.discountPercent,
      discount: (invoice.subtotal * (invoice.discountPercent || 0)) / 100,
      taxableAmount: invoice.taxableAmount,
      gst: invoice.gstBreakup,
      roundOff: invoice.roundOff,
      total: invoice.total,
      includeSignature: req.query.includeSignature === "true",
      includeSeal: req.query.includeSeal === "true"
    };

    // Resolve theme
    const BusinessSettings = require("../models/BusinessSettings");
    const themeConfig = require("../config/themeConfig");
    let resolvedThemeNameForEmail = req.query.theme || invoice.theme;
    if (!resolvedThemeNameForEmail) {
      const settings = await BusinessSettings.findOne();
      resolvedThemeNameForEmail = settings?.defaultTheme || "indigo";
    }
    pdfData.theme = themeConfig[resolvedThemeNameForEmail] || themeConfig.indigo;

    const pdfBuffer = await generatePDF(pdfData);

    await sendEmailWithAttachment({
      to: process.env.ADMIN_EMAIL,
      subject: `Invoice Copy: ${invoice.invoiceNumber}`,
      text: `Please find the attached PDF copy of Invoice ${invoice.invoiceNumber}.`,
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      content: pdfBuffer,
    });

    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email failed:", err);
    res.status(500).json({ 
      error: err.message || "Failed to send email", 
      details: err.code || "UNKNOWN_ERROR"
    });
  }
});

module.exports = router;
