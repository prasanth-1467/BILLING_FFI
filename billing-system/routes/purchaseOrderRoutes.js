const express = require("express");
const router = express.Router();
const PurchaseOrder = require("../models/PurchaseOrder");

// CREATE PO
router.post("/", async (req, res) => {
  try {
    if (!req.body.supplier && !req.body.supplierName) {
      return res.status(400).json({ error: "Supplier is required" });
    }

    // Check availability of custom PO Number
    if (req.body.poNumber) {
      const existingPO = await PurchaseOrder.findOne({ poNumber: req.body.poNumber });
      if (existingPO) {
        return res.status(400).json({ error: "PO Number already exists. Please use a unique number." });
      }
    }

    const po = new PurchaseOrder(req.body);
    await po.save();
    res.status(201).json(po);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LIST PO
router.get("/", async (req, res) => {
  const pos = await PurchaseOrder.find()
    .populate("supplier")
    .populate("items.product")
    .sort({ createdAt: -1 });

  res.json(pos);
});

const { generatePoPDF } = require("../utils/poPdfGenerator");

module.exports = router;

// GET PO PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate("supplier")
      .populate("items.product");

    if (!po) return res.status(404).json({ error: "Purchase Order not found" });

    const includeSignature = req.query.includeSignature === 'true';
    const includeSeal = req.query.includeSeal === 'true';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PO-${po.poNumber}.pdf`);

    const poData = po.toObject();
    poData.includeSignature = includeSignature;
    poData.includeSeal = includeSeal;

    // Resolve theme
    const BusinessSettings = require("../models/BusinessSettings");
    const themeConfig = require("../config/themeConfig");
    let resolvedThemeName = req.query.theme || po.theme;
    if (!resolvedThemeName) {
      const settings = await BusinessSettings.findOne();
      resolvedThemeName = settings?.defaultTheme || "indigo";
    }
    poData.theme = themeConfig[resolvedThemeName] || themeConfig.indigo;

    generatePoPDF(res, poData);

  } catch (error) {
    console.error("PO PDF Error:", error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET PO BY ID
router.get("/:id", async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate("supplier")
      .populate("items.product");
    if (!po) return res.status(404).json({ error: "Purchase Order not found" });
    res.json(po);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE PO (Methods like PATCH)
router.patch("/:id", async (req, res) => {
  try {
    const { poNumber, date } = req.body;

    // Check if PO exists
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ error: "Purchase Order not found" });

    // If updating PO Number, check uniqueness
    if (poNumber && poNumber !== po.poNumber) {
      const existing = await PurchaseOrder.findOne({ poNumber });
      if (existing) {
        return res.status(400).json({ error: "PO Number already exists" });
      }
      po.poNumber = poNumber;
    }

    if (date) {
      po.date = date;
    }

    if (req.body.theme !== undefined) {
      po.theme = req.body.theme;
    }

    await po.save();
    res.json(po);
  } catch (err) {
    console.error("Update failed", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE PO
router.delete("/:id", async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ error: "Purchase Order not found" });

    // Optional: Check if PO can be deleted (e.g., status is Draft) - For now allowing delete as per request
    await po.deleteOne();
    res.json({ message: "Purchase Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
