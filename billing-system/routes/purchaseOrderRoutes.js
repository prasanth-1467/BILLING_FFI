const express = require("express");
const router = express.Router();
const PurchaseOrder = require("../models/PurchaseOrder");

// CREATE PO
router.post("/", async (req, res) => {
  try {
    if (!req.body.supplier) {
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PO-${po.poNumber}.pdf`);

    const poData = po.toObject();
    poData.includeSignature = includeSignature;

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
    const { poNumber } = req.body;

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
      await po.save();
    }

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
