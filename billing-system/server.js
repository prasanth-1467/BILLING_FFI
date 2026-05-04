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
  .then(() => console.log("MongoDB Connected"))
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start Agent Runner
  const AgentRunner = require("./agents/AgentRunner");
  // Optional: Run agents immediately on startup for testing
  // AgentRunner.runAgents(); 
});
