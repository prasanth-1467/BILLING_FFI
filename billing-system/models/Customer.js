const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  gstNumber: String,
  state: String,
  address: String,
  tags: [{ type: String }]
});

module.exports = mongoose.model("Customer", customerSchema);
