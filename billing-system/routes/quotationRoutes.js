const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const { generatePDF } = require("../utils/pdfGenerator");
const { sendEmailWithAttachment } = require("../utils/emailService");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Counter = require("../models/Counter"); // Added Counter import

// Create quotation
router.post("/", async (req, res) => {
  try {
    const { 
      quoteNumber,
      customerId, 
      customerName, 
      customerGSTIN, 
      customerAddress, 
      customerState, 
      customerPhone,
      items, 
      discountPercent, 
      expiryDate, 
      shipTo 
    } = req.body;

    const date = new Date();

    // 1. Handle quoteNumber (Mandatory)
    let finalQuoteNumber = quoteNumber ? quoteNumber.trim() : null;
    if (!finalQuoteNumber) {
      return res.status(404).json({ error: "Quotation number is mandatory" });
    }

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const startYear = month >= 3 ? year : year - 1;
    const fyString = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;

    if (!finalQuoteNumber.toUpperCase().startsWith("FFI/")) {
      let numPart = finalQuoteNumber;
      if (/^\d+$/.test(numPart)) {
        numPart = String(numPart).padStart(3, '0');
      }
      finalQuoteNumber = `FFI/${fyString}/${numPart}`;
    }

    // Uniqueness check
    const existing = await Quotation.findOne({ quoteNumber: finalQuoteNumber });
    if (existing) {
      return res.status(400).json({ error: `Quotation number "${finalQuoteNumber}" already exists` });
    }

    // 2. Process Items (Enrich and get rates)
    let enrichedItems = [];
    for (let item of items) {
      let dbProduct = null;
      if (item.productId) {
        dbProduct = await Product.findById(item.productId);
      }

      enrichedItems.push({
        productId: item.productId || null,
        productCode: item.productCode || (dbProduct ? (dbProduct.productCode || dbProduct.code) : "Custom"),
        name: item.name || (dbProduct ? dbProduct.name : "Custom Product"),
        hsn: item.hsn || (dbProduct ? dbProduct.hsn : "-"),
        unit: item.unit || (dbProduct ? dbProduct.unit : "Nos"),
        qty: Number(item.qty),
        rate: Number(item.rate),
        gstRate: Number(item.gstRate || 0),
        amount: Number(item.qty) * Number(item.rate)
      });
    }

    // 3. Determine State Type for Tax Splits
    let finalState = customerState || "Tamil Nadu";
    if (customerId) {
      const dbCustomer = await Customer.findById(customerId);
      if (dbCustomer) {
        finalState = dbCustomer.state;
      }
    }

    const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");
    const isIntraState = normalize(finalState) === "tamilnadu";

    // 4. Calculate Totals using taxCalculator Utility
    const { calculateGST, calculateFinal } = require("../utils/taxCalculator");
    const calcInitial = calculateGST(enrichedItems, finalState);
    const results = calculateFinal(calcInitial.subtotal, Number(discountPercent || 0), enrichedItems, isIntraState);

    const { subtotal, taxableAmount, gstBreakup, roundOff, total } = results;

    const quote = new Quotation({
      quoteNumber: finalQuoteNumber,
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
      expiryDate,
      theme: req.body.theme || null,
      shipTo
    });

    await quote.save();
    res.json(quote);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all quotations
router.get("/", async (req, res) => {
  const quotes = await Quotation.find()
    .populate("customerId")
    .sort({ quoteNumber: 1 });
  res.json(quotes);
});

// Get single quotation by ID
router.get("/:id", async (req, res) => {
  try {
    const quote = await Quotation.findOne({
      $or: [{ _id: req.params.id }, { id: req.params.id }]
    })
      .populate("customerId")
      .populate("items.productId");

    if (!quote) return res.status(404).json({ error: "Quotation not found" });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE QUOTATION DETAILS & ITEMS (FULL EDIT)
router.put("/:id", async (req, res) => {
  try {
    const existingQuote = await Quotation.findOne({
      $or: [{ _id: req.params.id }, { id: req.params.id }]
    });
    if (!existingQuote) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    const { 
      quoteNumber,
      customerId, 
      customerName, 
      customerGSTIN, 
      customerAddress, 
      customerState, 
      customerPhone,
      items, 
      discountPercent, 
      date,
      expiryDate,
      shipTo,
      theme
    } = req.body;

    // Check unique quotation number if modified
    if (quoteNumber && quoteNumber !== existingQuote.quoteNumber) {
      const dup = await Quotation.findOne({ quoteNumber });
      if (dup && dup._id.toString() !== existingQuote._id.toString()) {
        return res.status(400).json({ error: `Quotation number "${quoteNumber}" already exists` });
      }
    }

    // Process Items
    let enrichedItems = [];
    if (items && Array.isArray(items)) {
      for (let item of items) {
        let dbProduct = null;
        if (item.productId) {
          dbProduct = await Product.findById(item.productId);
        }

        enrichedItems.push({
          productId: item.productId || null,
          productCode: item.productCode || (dbProduct ? (dbProduct.productCode || dbProduct.code) : "Custom"),
          name: item.name || (dbProduct ? dbProduct.name : "Custom Product"),
          hsn: item.hsn || (dbProduct ? dbProduct.hsn : "-"),
          unit: item.unit || (dbProduct ? dbProduct.unit : "Nos"),
          qty: Number(item.qty || item.quantity || 1),
          rate: Number(item.rate || 0),
          gstRate: Number(item.gstRate || 0),
          amount: Number(item.qty || item.quantity || 1) * Number(item.rate || 0)
        });
      }
    } else {
      enrichedItems = existingQuote.items;
    }

    // Determine state for tax calculations
    const finalState = customerState || existingQuote.customerState || "Tamil Nadu";
    const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");
    const isIntraState = normalize(finalState) === "tamilnadu";

    const { calculateGST, calculateFinal } = require("../utils/taxCalculator");
    const calcInitial = calculateGST(enrichedItems, finalState);
    const discPct = discountPercent !== undefined ? Number(discountPercent) : (existingQuote.discountPercent || 0);
    const results = calculateFinal(calcInitial.subtotal, discPct, enrichedItems, isIntraState);

    const { subtotal, taxableAmount, gstBreakup, roundOff, total } = results;

    // Update quote properties
    existingQuote.quoteNumber = quoteNumber || existingQuote.quoteNumber;
    existingQuote.customerId = customerId !== undefined ? (customerId || null) : existingQuote.customerId;
    existingQuote.customerName = customerName !== undefined ? customerName : existingQuote.customerName;
    existingQuote.customerGSTIN = customerGSTIN !== undefined ? customerGSTIN : existingQuote.customerGSTIN;
    existingQuote.customerAddress = customerAddress !== undefined ? customerAddress : existingQuote.customerAddress;
    existingQuote.customerState = customerState !== undefined ? customerState : existingQuote.customerState;
    existingQuote.customerPhone = customerPhone !== undefined ? customerPhone : existingQuote.customerPhone;
    existingQuote.items = enrichedItems;
    existingQuote.subtotal = subtotal;
    existingQuote.discountPercent = discPct;
    existingQuote.taxableAmount = taxableAmount;
    existingQuote.gstBreakup = gstBreakup;
    existingQuote.roundOff = roundOff;
    existingQuote.total = total;
    if (date) existingQuote.date = new Date(date);
    if (expiryDate) existingQuote.expiryDate = new Date(expiryDate);
    if (shipTo !== undefined) existingQuote.shipTo = shipTo;
    if (theme !== undefined) existingQuote.theme = theme;

    await existingQuote.save();
    res.json(existingQuote);

  } catch (err) {
    console.error("Quotation Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Generate PDF (Quotation or Proforma Invoice)
router.get("/:id/pdf", async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id)
      .populate("customerId")
      .populate("items.productId");

    if (!quote) return res.status(404).json({ error: "Quotation not found" });

    const includeSignature = req.query.includeSignature === 'true';
    const includeSeal = req.query.includeSeal === 'true';

    // Resolve docType / heading title: 'QUOTATION' or 'PROFORMA INVOICE'
    const docType = (req.query.docType || req.query.documentTitle || 'quotation').toLowerCase();
    const documentTitle = (docType === 'proforma' || docType === 'proformainvoice')
      ? 'PROFORMA INVOICE'
      : 'QUOTATION';

    // Resolve theme
    const BusinessSettings = require("../models/BusinessSettings");
    const themeConfig = require("../config/themeConfig");
    let resolvedThemeName = req.query.theme || quote.theme;
    if (!resolvedThemeName) {
      const settings = await BusinessSettings.findOne();
      resolvedThemeName = settings?.defaultTheme || "indigo";
    }
    const theme = themeConfig[resolvedThemeName] || themeConfig.indigo;

    // Prepare Data for Generator
    const pdfData = {
      number: quote.quoteNumber,
      theme,
      date: quote.date,
      paymentTerms: "Valid for 30 days",
      customer: {
        name: quote.customerName || quote.customerId?.name || "-",
        address: quote.customerAddress || quote.customerId?.address || "-",
        gst: quote.customerGSTIN || quote.customerId?.gstNumber || "URD",
        phone: quote.customerPhone || quote.customerId?.phone || "-",
        state: quote.customerState || quote.customerId?.state || "-",
        shipTo: quote.shipTo // Pass shipTo data
      },
      items: quote.items.map(item => {
        const product = item.productId || {};
        return {
          name: item.name || product.name || "Unknown Product",
          hsn: item.hsn || product.hsn || "-",
          unit: item.unit || product.unit || "-",
          qty: item.qty,
          rate: item.rate,
          gstRate: item.gstRate,
          amount: item.amount
        };
      }),
      subtotal: quote.subtotal,
      discount: (quote.subtotal * (quote.discountPercent || 0)) / 100,
      discountPercent: quote.discountPercent,
      taxableAmount: quote.taxableAmount,
      gst: quote.gstBreakup,
      roundOff: quote.roundOff,
      total: quote.total,
      includeSignature, // Add to data object
      includeSeal
    };

    const filenamePrefix = documentTitle === 'PROFORMA INVOICE' ? 'Proforma' : 'Quotation';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filenamePrefix}-${quote.quoteNumber}.pdf`);

    generatePDF(res, pdfData, documentTitle);

  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// DELETE /api/quotations/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const quote = await Quotation.findOne({ $or: [{ _id: id }, { id: id }] });

    if (!quote) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    // Constraint removed: Allow deleting converted quotations

    await Quotation.deleteOne({ _id: quote._id });

    res.json({ message: "Quotation deleted successfully", id: quote._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/quotations/:id - Update quotation (specifically quoteNumber and date)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quoteNumber, date } = req.body;

    const quote = await Quotation.findOne({ $or: [{ _id: id }, { id: id }] });
    if (!quote) return res.status(404).json({ error: "Quotation not found" });

    if (quoteNumber) {
      // Check uniqueness excluding current doc
      const existing = await Quotation.findOne({ quoteNumber });
      if (existing && existing._id.toString() !== quote._id.toString()) {
        return res.status(400).json({ error: "Quotation number already exists" });
      }
      quote.quoteNumber = quoteNumber;
    }

    if (date) {
      quote.date = date;
    }

    if (req.body.theme !== undefined) {
      quote.theme = req.body.theme;
    }

    await quote.save();
    res.json(quote);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/quotations/:id/status - Update Status manually
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const quote = await Quotation.findOne({ $or: [{ _id: id }, { id: id }] });
    if (!quote) return res.status(404).json({ error: "Quotation not found" });

    quote.status = status;
    await quote.save();
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/quotations/:id/duplicate - Duplicate Quotation
router.post("/:id/duplicate", async (req, res) => {
  try {
    const { id } = req.params;
    const original = await Quotation.findOne({ $or: [{ _id: id }, { id: id }] });
    if (!original) return res.status(404).json({ error: "Quotation not found" });

    // Generate new Quote Number
    const Counter = require("../models/Counter");
    const counter = await Counter.findOneAndUpdate(
      { id: "quoteNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    const fyString = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
    const newQuoteNumber = `FFI/${fyString}/${String(counter.seq).padStart(3, '0')}`;

    const newQuote = new Quotation({
      ...original.toObject(),
      _id: undefined,
      quoteNumber: newQuoteNumber,
      date: new Date(),
      status: "Draft",
      createdAt: undefined,
      updatedAt: undefined
    });

    await newQuote.save();
    res.json(newQuote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Email Quotation to Admin
router.post("/:id/email-to-me", async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id)
      .populate("customerId")
      .populate("items.productId");
    if (!quote) return res.status(404).json({ error: "Quotation not found" });

    const pdfData = {
      number: quote.quoteNumber,
      date: quote.date,
      paymentTerms: "Valid for 30 days",
      customer: {
        name: quote.customerName || quote.customerId?.name || "-",
        address: quote.customerAddress || quote.customerId?.address || "-",
        gst: quote.customerGSTIN || quote.customerId?.gstNumber || "URD",
        phone: quote.customerPhone || quote.customerId?.phone || "-",
        state: quote.customerState || quote.customerId?.state || "-",
        shipTo: quote.shipTo
      },
      items: quote.items.map(item => ({
        name: item.name || item.productId?.name || "Product",
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        hsn: item.hsn || item.productId?.hsn || "",
        gstRate: item.gstRate,
        unit: item.unit || item.productId?.unit || ""
      })),
      subtotal: quote.subtotal,
      discountPercent: quote.discountPercent,
      discount: (quote.subtotal * (quote.discountPercent || 0)) / 100,
      taxableAmount: quote.taxableAmount,
      gst: quote.gstBreakup,
      roundOff: quote.roundOff,
      total: quote.total,
      includeSignature: req.query.includeSignature === "true",
      includeSeal: req.query.includeSeal === "true"
    };

    // Resolve theme
    const BusinessSettings = require("../models/BusinessSettings");
    const themeConfig = require("../config/themeConfig");
    let resolvedThemeNameForEmail = req.query.theme || quote.theme;
    if (!resolvedThemeNameForEmail) {
      const settings = await BusinessSettings.findOne();
      resolvedThemeNameForEmail = settings?.defaultTheme || "indigo";
    }
    const docType = (req.query.docType || req.query.documentTitle || 'quotation').toLowerCase();
    const documentTitle = (docType === 'proforma' || docType === 'proformainvoice')
      ? 'PROFORMA INVOICE'
      : 'QUOTATION';

    const pdfBuffer = await generatePDF(pdfData, documentTitle);

    const filenamePrefix = documentTitle === 'PROFORMA INVOICE' ? 'Proforma' : 'Quotation';
    await sendEmailWithAttachment({
      to: process.env.ADMIN_EMAIL,
      subject: `${documentTitle} Copy: ${quote.quoteNumber}`,
      text: `Please find the attached PDF copy of ${documentTitle} ${quote.quoteNumber}.`,
      filename: `${filenamePrefix}-${quote.quoteNumber}.pdf`,
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
