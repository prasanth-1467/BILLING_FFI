const Invoice = require("../models/Invoice");
const Notification = require("../models/Notification");

const InsightAgent = {
    run: async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tommorow = new Date(today);
            tommorow.setDate(today.getDate() + 1);

            // Daily Revenue Insight
            const dailySales = await Invoice.aggregate([
                { $match: { date: { $gte: today, $lt: tommorow } } },
                { $group: { _id: null, total: { $sum: "$total" } } }
            ]);

            const totalToday = dailySales.length > 0 ? dailySales[0].total : 0;

            if (totalToday > 0) {
                await Notification.create({
                    title: "Daily Revenue Insight",
                    message: `You've generated ₹${totalToday.toLocaleString()} in revenue today.`,
                    type: "insight",
                    priority: "low"
                });
            }

            // Check for pending payments (overdue logic could be added here)
            const pendingInvoices = await Invoice.countDocuments({ status: "Pending" });
            if (pendingInvoices > 0) {
                await Notification.create({
                    title: "Payment Follow-up",
                    message: `There are ${pendingInvoices} pending invoices that may require follow-up.`,
                    type: "alert",
                    priority: "medium",
                    actionUrl: "/invoices"
                });
            }

        } catch (error) {
            console.error("InsightAgent Error:", error);
        }
    }
};

module.exports = InsightAgent;
