const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
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
  paymentType: String,
  paymentTerms: { type: String, default: "Due on Receipt" },
  dueDate: { type: Date },
  paidAmount: { type: Number, default: 0 },
  balance: Number,
  status: { type: String, default: "Unpaid" },
  shipTo: {
    name: String,
    address: String,
    state: String,
    city: String,
    phone: String
  }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
