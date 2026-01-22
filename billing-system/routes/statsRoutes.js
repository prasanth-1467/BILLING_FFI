const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");

router.get("/", async (req, res) => {
    try {
        // 1. Total Sales & Total Invoices
        // 1. Total Sales (Paid only) & Total Invoices (All)
        const totalInvoices = await Invoice.countDocuments();

        const salesStats = await Invoice.aggregate([
            {
                $match: {
                    $or: [
                        { status: "Paid" },
                        { balance: { $lte: 0 } } // Backward compatibility
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$total" }
                }
            }
        ]);

        const totalSales = salesStats.length > 0 ? salesStats[0].totalSales : 0;



        // 2. New Customers (Total Customers count for now)
        const totalCustomers = await Customer.countDocuments();

        // 3. Products Low Stock (stock < 10)
        // 3. Products Low Stock (stock < 10)
        const lowStockCount = await Product.countDocuments({ stockQty: { $lt: 10 } });

        // 4. Monthly Sales (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlySales = await Invoice.aggregate([
            { $match: { date: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
                    total: { $sum: "$total" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 5. Recent Invoices (Limit 5)
        const recentInvoices = await Invoice.find()
            .sort({ date: -1 })
            .limit(5)
            .populate("customerId", "name");

        res.json({
            totalSales,
            totalInvoices,
            totalCustomers,
            lowStockCount,
            monthlySales,
            recentInvoices
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching stats" });
    }
});

module.exports = router;
