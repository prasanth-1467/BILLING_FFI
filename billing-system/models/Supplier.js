const mongoose = require("mongoose");
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstin: { type: String, required: true, uppercase: true },
  phone: { type: String },
  email: String,
  address: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Supplier", supplierSchema);