const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const RestockAgent = require("../agents/RestockAgent");

// Add product
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    // Immediate notification check
    await RestockAgent.checkAndNotify(product);

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all products
router.get("/", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Bulk actions
router.post("/bulk-action", async (req, res) => {
  const { action, productIds, data } = req.body;
  if (!action || !productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    if (action === 'delete') {
      await Product.deleteMany({ _id: { $in: productIds } });
    } else if (action === 'update_gst') {
      await Product.updateMany({ _id: { $in: productIds } }, { $set: { gstRate: Number(data.gstRate) } });
    } else if (action === 'update_category') {
      await Product.updateMany({ _id: { $in: productIds } }, { $set: { category: data.category } });
    } else if (action === 'update_price') {
      await Product.updateMany({ _id: { $in: productIds } }, { $set: { sellingPrice: Number(data.sellingPrice) } });
    } else {
      return res.status(400).json({ error: "Unknown action" });
    }
    res.json({ message: "Bulk action successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    Object.assign(product, req.body);
    await product.save();

    // Immediate notification check
    await RestockAgent.checkAndNotify(product);

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete product
router.delete("/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;