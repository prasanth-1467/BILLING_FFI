const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const Counter = require("../models/Counter"); // Added Counter import
const { generatePDF } = require("../utils/pdfGenerator");
const { sendEmailWithAttachment, sendInvoiceEmail, isValidEmail } = require("../utils/emailService");

// In-memory set to prevent duplicate email submissions while a send request is processing
const activeEmailLocks = new Set();

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
      customerEmail: req.body.customerEmail || null,
      
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
      shipTo: shipTo || null,
      ewayBillNo: req.body.ewayBillNo || null
    });

    await invoice.save();

    // Sync Counter
    const numMatch = finalInvoiceNumber.match(/(\d+)$/);
    if (numMatch) {
      const seqNum = parseInt(numMatch[1], 10);
      if (!isNaN(seqNum)) {
        await Counter.findOneAndUpdate(
          { id: "invoiceNumber" },
          { $max: { seq: seqNum } },
          { upsert: true }
        );
      }
    }

    res.json(invoice);

  } catch (err) {
    console.error("Direct Invoice Creation Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// UPDATE INVOICE DETAILS & ITEMS (FULL EDIT)
router.put("/:id", async (req, res) => {
  try {
    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

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
      shipTo,
      ewayBillNo,
      theme
    } = req.body;

    // Check unique invoice number if modified
    if (invoiceNumber && invoiceNumber !== existingInvoice.invoiceNumber) {
      const dup = await Invoice.findOne({ invoiceNumber });
      if (dup && dup._id.toString() !== req.params.id) {
        return res.status(400).json({ error: `Invoice number "${invoiceNumber}" already exists` });
      }
    }

    // 1. Process Items & Handle Stock Adjustments
    let enrichedItems = [];
    if (items && Array.isArray(items)) {
      // Revert old stock reductions if products existed
      for (let oldItem of existingInvoice.items) {
        if (oldItem.productId) {
          const oldProd = await Product.findById(oldItem.productId);
          if (oldProd) {
            oldProd.stockQty = (oldProd.stockQty || 0) + Number(oldItem.qty || 0);
            await oldProd.save();
          }
        }
      }

      // Apply new stock reductions and build enriched items
      for (let item of items) {
        let dbProduct = null;
        if (item.productId) {
          dbProduct = await Product.findById(item.productId);
          if (dbProduct) {
            dbProduct.stockQty = (dbProduct.stockQty || 0) - Number(item.qty || 0);
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
    } else {
      enrichedItems = existingInvoice.items;
    }

    // 2. Tax Splits & Total Calculations
    const finalState = customerState || existingInvoice.customerState || "Tamil Nadu";
    const myStateNorm = "tamilnadu";
    const isIntraState = finalState.toLowerCase().replace(/[\s\-_]/g, '') === myStateNorm;

    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    enrichedItems.forEach(item => {
      subtotal += item.amount;
      const gstRate = item.gstRate || 0;
      const itemTax = (item.amount * gstRate) / 100;
      if (isIntraState) {
        cgstTotal += itemTax / 2;
        sgstTotal += itemTax / 2;
      } else {
        igstTotal += itemTax;
      }
    });

    const discPct = discountPercent !== undefined ? Number(discountPercent) : (existingInvoice.discountPercent || 0);
    const discountAmount = (subtotal * discPct) / 100;
    const taxableAmount = subtotal - discountAmount;

    if (discPct > 0 && subtotal > 0) {
      const factor = (100 - discPct) / 100;
      cgstTotal = cgstTotal * factor;
      sgstTotal = sgstTotal * factor;
      igstTotal = igstTotal * factor;
    }

    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const rawTotal = taxableAmount + totalTax;
    const finalTotal = Math.round(rawTotal);
    const roundOff = Number((finalTotal - rawTotal).toFixed(2));

    const gstBreakup = {
      cgst: Number(cgstTotal.toFixed(2)),
      sgst: Number(sgstTotal.toFixed(2)),
      igst: Number(igstTotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2))
    };

    const calculatedPaidAmount = paidAmount !== undefined ? Number(paidAmount) : existingInvoice.paidAmount;
    const balance = finalTotal - calculatedPaidAmount;
    const status = balance <= 0 ? "Paid" : (calculatedPaidAmount > 0 ? "Partially Paid" : "Pending");

    // 3. Update Invoice document
    existingInvoice.invoiceNumber = invoiceNumber || existingInvoice.invoiceNumber;
    existingInvoice.customerId = customerId !== undefined ? (customerId || null) : existingInvoice.customerId;
    existingInvoice.customerName = customerName !== undefined ? customerName : existingInvoice.customerName;
    existingInvoice.customerGSTIN = customerGSTIN !== undefined ? customerGSTIN : existingInvoice.customerGSTIN;
    existingInvoice.customerAddress = customerAddress !== undefined ? customerAddress : existingInvoice.customerAddress;
    existingInvoice.customerState = customerState !== undefined ? customerState : existingInvoice.customerState;
    existingInvoice.customerPhone = customerPhone !== undefined ? customerPhone : existingInvoice.customerPhone;
    existingInvoice.customerEmail = req.body.customerEmail !== undefined ? req.body.customerEmail : existingInvoice.customerEmail;
    existingInvoice.items = enrichedItems;
    existingInvoice.subtotal = subtotal;
    existingInvoice.discountPercent = discPct;
    existingInvoice.taxableAmount = taxableAmount;
    existingInvoice.gstBreakup = gstBreakup;
    existingInvoice.roundOff = roundOff;
    existingInvoice.total = finalTotal;
    existingInvoice.paymentType = paymentType || existingInvoice.paymentType;
    existingInvoice.paidAmount = calculatedPaidAmount;
    existingInvoice.balance = balance;
    existingInvoice.status = status;
    if (date) existingInvoice.date = new Date(date);
    if (dueDate) existingInvoice.dueDate = new Date(dueDate);
    if (shipTo !== undefined) existingInvoice.shipTo = shipTo;
    if (ewayBillNo !== undefined) existingInvoice.ewayBillNo = ewayBillNo;
    if (theme !== undefined) existingInvoice.theme = theme;

    await existingInvoice.save();
    res.json(existingInvoice);
  } catch (err) {
    console.error("Invoice Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// RECORD PAYMENT FOR INVOICE
router.patch("/:id/payment", async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentAmount = Number(amount || 0);

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
    const newBalance = Math.max(0, (invoice.total || 0) - newPaidAmount);
    const newStatus = newBalance <= 0 ? "Paid" : "Partially Paid";

    invoice.paidAmount = newPaidAmount;
    invoice.balance = newBalance;
    invoice.status = newStatus;

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    console.error("Record Payment Error:", err);
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

// DELETE INVOICE
router.delete("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // Recalculate max sequence from remaining active invoices
    const remainingInvoices = await Invoice.find({}, { invoiceNumber: 1 });
    let maxSeq = 0;
    remainingInvoices.forEach(inv => {
      if (inv.invoiceNumber) {
        const match = inv.invoiceNumber.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    // Update Counter sequence to highest remaining
    await Counter.findOneAndUpdate(
      { id: "invoiceNumber" },
      { seq: maxSeq },
      { upsert: true }
    );

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
      customerName: quote.customerName,
      customerGSTIN: quote.customerGSTIN,
      customerAddress: quote.customerAddress,
      customerState: quote.customerState,
      customerPhone: quote.customerPhone,
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
      shipTo: quote.shipTo ? {
        name: quote.shipTo.name,
        address: quote.shipTo.address,
        state: quote.shipTo.state,
        city: quote.shipTo.city,
        phone: quote.shipTo.phone
      } : null
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
// GET NEXT INVOICE NUMBER
router.get("/next-number", async (req, res) => {
  try {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const startYear = month >= 3 ? year : year - 1;
    const fyString = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;

    // Find all active invoices to determine actual highest sequence number
    const invoices = await Invoice.find({}, { invoiceNumber: 1 });
    let maxSeq = 0;

    invoices.forEach(inv => {
      if (inv.invoiceNumber) {
        const match = inv.invoiceNumber.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    // Resync Counter sequence to match actual highest existing invoice
    await Counter.findOneAndUpdate(
      { id: "invoiceNumber" },
      { seq: maxSeq },
      { upsert: true }
    );

    const nextSeq = maxSeq + 1;
    const nextInvoiceNumber = `FFI/${fyString}/${String(nextSeq).padStart(3, '0')}`;

    res.json({ nextInvoiceNumber });
  } catch (err) {
    console.error("Error generating next invoice number:", err);
    res.status(500).json({ error: err.message });
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
      ewayBillNo: invoice.ewayBillNo,
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
      includeSeal,
      copyType: req.query.copyType || 'none'
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

// Helper to construct normalized PDF data for invoice rendering
const prepareInvoicePdfData = async (invoice, reqQuery = {}) => {
  const BusinessSettings = require("../models/BusinessSettings");
  const themeConfig = require("../config/themeConfig");
  let resolvedThemeName = reqQuery.theme || invoice.theme;
  if (!resolvedThemeName) {
    const settings = await BusinessSettings.findOne();
    resolvedThemeName = settings?.defaultTheme || "indigo";
  }
  const theme = themeConfig[resolvedThemeName] || themeConfig.indigo;

  return {
    number: invoice.invoiceNumber,
    date: invoice.date,
    theme,
    ewayBillNo: invoice.ewayBillNo,
    paymentTerms: "Due on Receipt",
    customer: {
      name: invoice.customerName || invoice.customerId?.name || "-",
      address: invoice.customerAddress || invoice.customerId?.address || "-",
      gst: invoice.customerGSTIN || invoice.customerId?.gstNumber || "URD",
      phone: invoice.customerPhone || invoice.customerId?.phone || "-",
      email: invoice.customerEmail || invoice.customerId?.email || "-",
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
    includeSignature: reqQuery.includeSignature === "true",
    includeSeal: reqQuery.includeSeal === "true",
    copyType: reqQuery.copyType || 'none'
  };
};

// 1. Email Invoice PDF to Customer
router.post("/:id/email-customer", async (req, res) => {
  const invoiceId = req.params.id;
  if (activeEmailLocks.has(invoiceId)) {
    return res.status(409).json({ error: "An email dispatch is currently in progress for this invoice. Please wait." });
  }

  activeEmailLocks.add(invoiceId);

  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate("customerId")
      .populate("items.productId");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    // Determine target recipient
    const manualEmail = req.body?.email?.trim();
    const customerEmail = invoice.customerId?.email?.trim() || invoice.customerEmail?.trim();
    const targetEmail = manualEmail || customerEmail;

    if (!targetEmail) {
      return res.status(400).json({ error: "Customer email is missing. Please provide a recipient email address." });
    }

    if (!isValidEmail(targetEmail)) {
      return res.status(400).json({ error: `"${targetEmail}" is not a valid email address.` });
    }

    // Generate exact PDFKit buffer
    const pdfData = await prepareInvoicePdfData(invoice, req.query);
    const pdfBuffer = await generatePDF(pdfData);

    const custName = invoice.customerName || invoice.customerId?.name || "Valued Customer";
    const result = await sendInvoiceEmail({
      to: targetEmail,
      invoiceNumber: invoice.invoiceNumber,
      customerName: custName,
      total: invoice.total,
      balance: invoice.balance,
      dueDate: invoice.dueDate,
      pdfBuffer,
      recipientType: "customer"
    });

    // Optionally save entered email to customer profile for future invoices
    if (req.body?.saveToCustomer && invoice.customerId?._id) {
      const Customer = require("../models/Customer");
      await Customer.findByIdAndUpdate(invoice.customerId._id, { email: targetEmail });
    }

    // Update invoice record with email and history log
    invoice.customerEmail = targetEmail;
    if (!invoice.emailHistory) invoice.emailHistory = [];
    invoice.emailHistory.push({
      recipient: targetEmail,
      recipientType: "customer",
      status: "sent",
      messageId: result?.messageId || null,
      sentAt: new Date()
    });
    await invoice.save();

    res.json({
      success: true,
      message: `Tax Invoice #${invoice.invoiceNumber} sent to ${targetEmail} successfully.`,
      recipient: targetEmail,
      messageId: result?.messageId
    });
  } catch (err) {
    console.error("[InvoiceRoutes] Customer email failed:", err);

    // Record failure in history if invoice exists
    try {
      const failedInv = await Invoice.findById(invoiceId);
      if (failedInv) {
        if (!failedInv.emailHistory) failedInv.emailHistory = [];
        failedInv.emailHistory.push({
          recipient: req.body?.email?.trim() || "unknown",
          recipientType: "customer",
          status: "failed",
          error: err.message,
          sentAt: new Date()
        });
        await failedInv.save();
      }
    } catch (logErr) {
      console.error("[InvoiceRoutes] Failed to log email error:", logErr);
    }

    res.status(500).json({
      error: err.message || "Failed to send invoice email via Resend.",
      details: err.code || "EMAIL_DELIVERY_ERROR"
    });
  } finally {
    activeEmailLocks.delete(invoiceId);
  }
});

// 2. Email Invoice PDF to Myself (Business / Admin Copy)
router.post("/:id/email-to-me", async (req, res) => {
  const invoiceId = req.params.id;
  if (activeEmailLocks.has(invoiceId)) {
    return res.status(409).json({ error: "An email dispatch is currently in progress for this invoice. Please wait." });
  }

  activeEmailLocks.add(invoiceId);

  try {
    const businessEmail = (process.env.BUSINESS_EMAIL || process.env.ADMIN_EMAIL || "").trim();
    if (!businessEmail || !isValidEmail(businessEmail)) {
      return res.status(500).json({
        error: "Business email recipient is not configured in server environment (BUSINESS_EMAIL or ADMIN_EMAIL)."
      });
    }

    const invoice = await Invoice.findById(invoiceId)
      .populate("customerId")
      .populate("items.productId");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    const pdfData = await prepareInvoicePdfData(invoice, req.query);
    const pdfBuffer = await generatePDF(pdfData);

    const custName = invoice.customerName || invoice.customerId?.name || "Customer";
    const result = await sendInvoiceEmail({
      to: businessEmail,
      invoiceNumber: invoice.invoiceNumber,
      customerName: custName,
      total: invoice.total,
      balance: invoice.balance,
      dueDate: invoice.dueDate,
      pdfBuffer,
      recipientType: "myself"
    });

    if (!invoice.emailHistory) invoice.emailHistory = [];
    invoice.emailHistory.push({
      recipient: businessEmail,
      recipientType: "myself",
      status: "sent",
      messageId: result?.messageId || null,
      sentAt: new Date()
    });
    await invoice.save();

    res.json({
      success: true,
      message: `Invoice #${invoice.invoiceNumber} copy sent to business email (${businessEmail}) successfully.`,
      recipient: businessEmail,
      messageId: result?.messageId
    });
  } catch (err) {
    console.error("[InvoiceRoutes] Business email copy failed:", err);

    try {
      const failedInv = await Invoice.findById(invoiceId);
      if (failedInv) {
        if (!failedInv.emailHistory) failedInv.emailHistory = [];
        failedInv.emailHistory.push({
          recipient: process.env.BUSINESS_EMAIL || process.env.ADMIN_EMAIL || "admin",
          recipientType: "myself",
          status: "failed",
          error: err.message,
          sentAt: new Date()
        });
        await failedInv.save();
      }
    } catch (logErr) {
      console.error("[InvoiceRoutes] Failed to log email error:", logErr);
    }

    res.status(500).json({
      error: err.message || "Failed to send invoice copy email via Resend.",
      details: err.code || "EMAIL_DELIVERY_ERROR"
    });
  } finally {
    activeEmailLocks.delete(invoiceId);
  }
});

module.exports = router;
