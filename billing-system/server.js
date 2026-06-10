const express = require("express");
const mongoose = require("mongoose");
// DNS server override removed as it may interfere with system settings

require("dotenv").config();
const cors = require("cors");
const morgan = require("morgan");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");
    try {
      const BusinessSettings = require("./models/BusinessSettings");
      const exists = await BusinessSettings.findOne();
      if (!exists) {
        await BusinessSettings.create({ defaultTheme: "indigo" });
        console.log("Default BusinessSettings seeded.");
      }
    } catch (e) {
      console.error("Failed to seed business settings:", e);
    }
  })
  .catch(err => console.log(err));


app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/quotations", require("./routes/quotationRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/suppliers", require("./routes/supplierRoutes"));
app.use("/api/purchase-orders", require("./routes/purchaseOrderRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));


app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Billing API is running",
    timestamp: new Date()
  });
});

// Debug endpoint to check env variables (without showing values)
app.get("/api/debug/env", (req, res) => {
  res.json({
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || "onboarding@resend.dev",
    EMAIL_USER: !!process.env.EMAIL_USER,
    EMAIL_PASS: !!process.env.EMAIL_PASS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "not set",
    MONGO_URI: !!process.env.MONGO_URI,
    PORT: process.env.PORT || "5000",
    NODE_ENV: process.env.NODE_ENV || "development"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start Agent Runner
  const AgentRunner = require("./agents/AgentRunner");
  // Optional: Run agents immediately on startup for testing
  // AgentRunner.runAgents(); 
});
