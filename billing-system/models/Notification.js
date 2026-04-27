const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ["insight", "alert", "suggestion"],
        default: "insight"
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    read: { type: Boolean, default: false },
    actionUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    metadata: { type: Object } // For storing any additional context (e.g., quotationId)
});

module.exports = mongoose.model("Notification", notificationSchema);
