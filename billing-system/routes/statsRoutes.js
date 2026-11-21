const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Quotation = require("../models/Quotation");
const Notification = require("../models/Notification");

router.get("/", async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // Execute all independent database queries in parallel
        const [
            totalInvoices,
            salesStats,
            totalCustomers,
            lowStockCount,
            monthlySales,
            dailySales,
            recentInvoices,
            unpaidInvoices,
            quotationStats,
            agentNotifications
        ] = await Promise.all([
            // 1. Total Invoices
            Invoice.countDocuments(),

            // 2. Total Paid Sales
            Invoice.aggregate([
                {
                    $match: {
                        $or: [
                            { status: "Paid" },
                            { balance: { $lte: 0 } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: "$total" }
                    }
                }
            ]),

            // 3. Total Customers
            Customer.countDocuments(),

            // 4. Low Stock Products
            Product.countDocuments({ stockQty: { $lt: 10 } }),

            // 5. Monthly Sales (Last 6 months)
            Invoice.aggregate([
                { $match: { date: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
                        total: { $sum: "$total" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),

            // 6. Daily Sales (Last 30 days) for visual cashflow area chart
            Invoice.aggregate([
                { $match: { date: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        total: { $sum: "$total" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),

            // 7. Recent Invoices (Limit 5 with lightweight projection)
            Invoice.find()
                .sort({ date: -1 })
                .limit(5)
                .select("invoiceNumber total totalAmount balance status date dueDate customerId customerName customerPhone")
                .populate("customerId", "name phone"),

            // 8. Receivables: Unpaid Invoices with lightweight projection
            Invoice.find({
                $or: [
                    { balance: { $gt: 0 } },
                    { status: { $ne: "Paid" }, balance: { $exists: false } }
                ]
            })
            .select("invoiceNumber total totalAmount paidAmount balance status date dueDate customerId customerName customerPhone paymentMethod notes")
            .populate("customerId", "name phone"),

            // 9. Quotation Conversion Pipeline - Aggregated on database instead of unbounded in-memory fetch
            Quotation.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        totalValue: { $sum: "$total" }
                    }
                }
            ]),

            // 10. Autonomous Agent Intelligence Feed
            Notification.find()
                .sort({ createdAt: -1 })
                .limit(6)
        ]);

        const totalSales = salesStats.length > 0 ? salesStats[0].totalSales : 0;

        // Process Receivables Aging Engine
        let totalReceivables = 0;
        let overdueReceivables = 0;
        let overdueCount = 0;
        let dueTodayCount = 0;

        const aging = {
            current: { amount: 0, count: 0, label: "Current (Due Today / Future)" },
            days1to30: { amount: 0, count: 0, label: "1 - 30 Days Overdue" },
            days31to60: { amount: 0, count: 0, label: "31 - 60 Days Overdue" },
            days61to90: { amount: 0, count: 0, label: "61 - 90 Days Overdue" },
            days90plus: { amount: 0, count: 0, label: "90+ Days Critical Overdue" }
        };

        const customerBalances = {};
        const pendingInvoicesList = [];

        unpaidInvoices.forEach(inv => {
            const bal = (inv.balance != null && !isNaN(inv.balance))
                ? Number(inv.balance)
                : Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0));

            if (bal <= 0) return;

            pendingInvoicesList.push(inv);
            totalReceivables += bal;

            const refDate = inv.dueDate ? new Date(inv.dueDate) : (inv.date ? new Date(inv.date) : today);
            refDate.setHours(0, 0, 0, 0);

            const diffMs = today.getTime() - refDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                aging.current.amount += bal;
                aging.current.count += 1;
                if (diffDays === 0) dueTodayCount += 1;
            } else {
                overdueReceivables += bal;
                overdueCount += 1;

                if (diffDays <= 30) {
                    aging.days1to30.amount += bal;
                    aging.days1to30.count += 1;
                } else if (diffDays <= 60) {
                    aging.days31to60.amount += bal;
                    aging.days31to60.count += 1;
                } else if (diffDays <= 90) {
                    aging.days61to90.amount += bal;
                    aging.days61to90.count += 1;
                } else {
                    aging.days90plus.amount += bal;
                    aging.days90plus.count += 1;
                }
            }

            // Customer aggregation for top receivable exposure
            const custName = inv.customerId?.name || inv.customerName || "Unknown Customer";
            const phone = inv.customerId?.phone || inv.customerPhone || "";
            if (!customerBalances[custName]) {
                customerBalances[custName] = {
                    customerName: custName,
                    phone,
                    balance: 0,
                    invoiceCount: 0,
                    oldestDate: inv.date,
                    latestDueDate: inv.dueDate
                };
            }
            customerBalances[custName].balance += bal;
            customerBalances[custName].invoiceCount += 1;
        });

        // Sort pending invoices by due date for workspace table
        pendingInvoicesList.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        const topReceivableCustomers = Object.values(customerBalances)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5);

        // Process Quotation Pipeline from database aggregation
        const quotationPipeline = {
            totalCount: 0,
            totalValue: 0,
            byStatus: {
                Draft: { count: 0, value: 0 },
                Sent: { count: 0, value: 0 },
                Approved: { count: 0, value: 0 },
                Converted: { count: 0, value: 0 },
                Rejected: { count: 0, value: 0 }
            },
            conversionRate: 0
        };

        (quotationStats || []).forEach(item => {
            const st = item._id || "Draft";
            if (!quotationPipeline.byStatus[st]) {
                quotationPipeline.byStatus[st] = { count: 0, value: 0 };
            }
            quotationPipeline.byStatus[st].count = item.count;
            quotationPipeline.byStatus[st].value = item.totalValue || 0;
            quotationPipeline.totalCount += item.count;
            quotationPipeline.totalValue += (item.totalValue || 0);
        });

        if (quotationPipeline.totalCount > 0) {
            quotationPipeline.conversionRate = Math.round(
                ((quotationPipeline.byStatus.Converted?.count || 0) / quotationPipeline.totalCount) * 100
            );
        }

        res.json({
            // Backward-compatible fields
            totalSales,
            totalInvoices,
            totalCustomers,
            lowStockCount,
            monthlySales,
            recentInvoices,

            // Executive CRM additions
            totalReceivables,
            overdueReceivables,
            overdueCount,
            dueTodayCount,
            aging,
            dailySales,
            topReceivableCustomers,
            quotationPipeline,
            agentNotifications,

            // Unpaid invoices for client workspace (avoids secondary /api/invoices query)
            unpaidInvoices: pendingInvoicesList
        });
    } catch (err) {
        console.error("Server error fetching executive stats:", err);
        res.status(500).json({ error: "Server error fetching stats" });
    }
});

module.exports = router;
