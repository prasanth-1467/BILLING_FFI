const Quotation = require("../models/Quotation");
const Notification = require("../models/Notification");

const InvoicerAgent = {
    run: async () => {
        try {
            // Find quotations that haven't been converted to invoices yet
            // Assuming we might need a way to track "Approved" status
            // For now, let's look for quotations created in the last 7 days that might be ready for conversion.
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentQuotations = await Quotation.find({
                date: { $gte: sevenDaysAgo }
            }).limit(5); // Limit to avoid noise

            for (const quote of recentQuotations) {
                // Check if an alert already exists
                const existingNotification = await Notification.findOne({
                    title: "Invoice Suggestion",
                    metadata: { quotationId: quote._id },
                    read: false
                });

                if (!existingNotification) {
                    await Notification.create({
                        title: "Invoice Suggestion",
                        message: `Quotation ${quote.quotationNumber} looks ready. Should I convert it to an Invoice?`,
                        type: "suggestion",
                        priority: "medium",
                        actionUrl: `/quotations`, // Ideally direct link to convert
                        metadata: { quotationId: quote._id }
                    });
                }
            }
        } catch (error) {
            console.error("InvoicerAgent Error:", error);
        }
    }
};

module.exports = InvoicerAgent;
