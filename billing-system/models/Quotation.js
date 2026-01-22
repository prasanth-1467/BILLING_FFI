const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema({
  quoteNumber: String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  date: { type: Date, default: Date.now },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      qty: Number,
      rate: Number,
      gstRate: Number,
      amount: Number
    }
  ],
  subtotal: Number,
  discountPercent: Number,
  taxableAmount: Number,
  gstBreakup: Object,
  roundOff: { type: Number, default: 0 },
  total: Number,
  status: { type: String, default: "Draft" },
  expiryDate: Date,
  shipTo: {
    name: String,
    address: String,
    state: String,
    city: String,
    phone: String
  }
});

module.exports = mongoose.model("Quotation", quotationSchema);
