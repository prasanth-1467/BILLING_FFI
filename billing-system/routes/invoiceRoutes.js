const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const Counter = require("../models/Counter"); // Added Counter import
const { generatePDF } = require("../utils/pdfGenerator");
const { sendEmailWithAttachment } = require("../utils/emailService");

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
      status: balance <= 0 ? "Paid" : (paidAmount > 0 ? "Partially Paid" : "Unpaid"),
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

    // Construct Data Object for PDF
    const pdfData = {
      number: invoice.invoiceNumber,
      date: invoice.date,
      paymentTerms: "Immediate", // You can make this dynamic if added to model
      customer: {
        name: invoice.customerId.name,
        address: invoice.customerId.address,
        gst: invoice.customerId.gstNumber,
        phone: invoice.customerId.phone,
        state: invoice.customerId.state, // Pass State
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
      discount: invoice.discountAmount,
      taxableAmount: invoice.taxableAmount,
      gst: invoice.gstBreakup,
      roundOff: invoice.roundOff,
      total: invoice.total,
      includeSignature // Add to data object
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

    let newStatus = "Unpaid";
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
        name: invoice.customerId.name,
        address: invoice.customerId.address,
        gst: invoice.customerId.gstNumber,
        phone: invoice.customerId.phone,
        state: invoice.customerId.state,
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
      includeSignature: req.query.includeSignature === "true"
    };

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
