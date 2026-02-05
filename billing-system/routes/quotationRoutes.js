const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Counter = require("../models/Counter"); // Added Counter import

// Create quotation
router.post("/", async (req, res) => {
  try {
    const { customerId, items, discountPercent, expiryDate, shipTo } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });



    // Verify Stock & Prepare Items
    const { calculateGST, calculateFinal } = require("../utils/taxCalculator");

    // 1. Process Items (Check stock, get rates)
    let enrichedItems = [];
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ error: "Product not found" });

      if (product.stockQty < item.qty)
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });

      enrichedItems.push({
        productId: product._id,
        qty: item.qty,
        rate: product.sellingPrice,
        gstRate: product.gstRate || 0, // Ensure GST rate exists
        amount: item.qty * product.sellingPrice
      });
    }

    // 2. Determine State Type
    const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");
    const isIntraState = normalize(customer.state) === "tamilnadu";

    // 3. Calculate Totals using Utility
    const calcInitial = calculateGST(enrichedItems, customer.state);
    const results = calculateFinal(calcInitial.subtotal, discountPercent, enrichedItems, isIntraState);

    // Destructure Results
    const { subtotal, taxableAmount, gstBreakup, roundOff, total } = results;

    // Generate Sequential Quote Number
    const counter = await Counter.findOneAndUpdate(
      { id: "quoteNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    // Financial Year Logic: If month >= 3 (April), start of new FY.
    // e.g., April 2025 -> 25-26. Jan 2026 -> 25-26.
    const startYear = month >= 3 ? year : year - 1;
    const fyString = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;

    const quoteNumber = `FFI/${fyString}/${String(counter.seq).padStart(3, '0')}`;

    const quote = new Quotation({
      quoteNumber,
      customerId,
      items: enrichedItems,
      subtotal,
      discountPercent,
      taxableAmount,

      gstBreakup,
      roundOff,
      total,
      expiryDate,
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
  const quotes = await Quotation.find().populate("customerId");
  res.json(quotes);
});

// Generate Proforma PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id)
      .populate("customerId")
      .populate("items.productId");

    if (!quote) return res.status(404).json({ error: "Quotation not found" });

    // Prepare Data for Generator
    const pdfData = {
      number: quote.quoteNumber,
      date: quote.date,
      paymentTerms: "Valid for 30 days",
      customer: {
        name: quote.customerId.name,
        address: quote.customerId.address,
        gst: quote.customerId.gstNumber,
        state: quote.customerId.state,
        shipTo: quote.shipTo // Pass shipTo data
      },
      items: quote.items.map(item => {
        const product = item.productId || {};
        return {
          name: product.name || "Unknown Product",
          hsn: product.hsn || "-",
          unit: product.unit || "-",
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
      taxableAmount: quote.taxableAmount,
      gst: quote.gstBreakup,
      roundOff: quote.roundOff,
      total: quote.total
    };

    const { generatePDF } = require("../utils/pdfGenerator");

    const includeSignature = req.query.includeSignature === 'true';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Quotation-${quote.quoteNumber}.pdf`);

    generatePDF(res, pdfData, "PROFORMA INVOICE", includeSignature);

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

// PATCH /api/quotations/:id - Update quotation (specifically quoteNumber)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quoteNumber } = req.body;

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

    await quote.save();
    res.json(quote);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
