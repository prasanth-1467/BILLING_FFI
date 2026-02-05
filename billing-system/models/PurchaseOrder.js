const mongoose = require("mongoose");

const poSchema = new mongoose.Schema({
  poNumber: { type: String, required: true },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true
  },
  date: { type: Date, default: Date.now },
  expectedDeliveryDate: Date,
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      modelNo: String,
      qty: { type: Number, required: true },
      unit: String,
      rate: Number,
      gstRate: { type: Number, default: 5 }
    }
  ],
  status: {
    type: String,
    enum: ["Draft", "Sent", "Cancelled"],
    default: "Draft"
  },
  remarks: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PurchaseOrder", poSchema);
