const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  
  // Manual customer details
  customerName: String,
  customerGSTIN: String,
  customerAddress: String,
  customerState: String,
  customerPhone: String,
  customerEmail: String,
  
  date: { type: Date, default: Date.now },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      
      // Manual product details
      name: String,
      hsn: String,
      unit: String,
      
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
  status: { type: String, default: "Pending" },
  theme: String,
  shipTo: {
    name: String,
    address: String,
    state: String,
    city: String,
    phone: String
  },
  ewayBillNo: String,
  emailHistory: [
    {
      recipient: String,
      recipientType: { type: String, enum: ["customer", "myself"], default: "customer" },
      sentAt: { type: Date, default: Date.now },
      status: { type: String, enum: ["sent", "failed"], default: "sent" },
      messageId: String,
      error: String
    }
  ]
});

module.exports = mongoose.model("Invoice", invoiceSchema);
