const express = require("express");
const router = express.Router();
const Supplier = require("../models/Supplier");

// CREATE
router.post("/", async (req, res) => {
  try {
    const { phone, gstin } = req.body;

    // Validation
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
    }
    if (gstin && gstin.length !== 15) {
      return res.status(400).json({ error: "GSTIN must be exactly 15 characters" });
    }

    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LIST
router.get("/", async (req, res) => {
  const suppliers = await Supplier.find().sort({ createdAt: -1 });
  res.json(suppliers);
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: "Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
