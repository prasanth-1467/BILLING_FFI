const mongoose = require("mongoose");

const businessSettingsSchema = new mongoose.Schema({
  defaultTheme: {
    type: String,
    enum: ["indigo", "emerald", "crimson", "charcoal", "plain"],
    default: "indigo"
  }
});

module.exports = mongoose.model("BusinessSettings", businessSettingsSchema);
