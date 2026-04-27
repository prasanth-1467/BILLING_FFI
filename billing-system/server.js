const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");

// Force Node.js to use Google DNS for SRV resolution (fixes ECONNREFUSED on some networks)
if (dns.setServers) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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
