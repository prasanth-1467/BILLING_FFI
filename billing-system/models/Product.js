const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productCode: { type: String, unique: true },
  name: String,
  hsn: String,
  unit: String,
  gstRate: Number,
  purchasePrice: Number,
  sellingPrice: Number,
  stockQty: Number,
  reorderLevel: Number,
  status: { type: String, default: "In Stock" }
});

// Auto-update status based on stock
// Auto-update status based on stock
productSchema.pre("save", function () {
  if (this.stockQty !== undefined) {
    if (this.stockQty <= 0) {
      this.status = "Out of Stock";
    } else if (this.stockQty > 0 && this.status === "Out of Stock") {
      this.status = "In Stock";
    }
  }
});

module.exports = mongoose.model("Product", productSchema);