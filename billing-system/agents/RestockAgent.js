const Product = require("../models/Product");
const Notification = require("../models/Notification");

const RestockAgent = {
    checkAndNotify: async (product) => {
        try {
            if (product.stockQty < 10) {
                // Escape special characters in product name for regex
                const escapedName = product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const existingNotification = await Notification.findOne({
                    title: "Low Stock Alert",
                    message: { $regex: escapedName },
                    read: false
                });

                if (!existingNotification) {
                    await Notification.create({
                        title: "Low Stock Alert",
                        message: `Product "${product.name}" is running low on stock (${product.stockQty} remaining). Consider restocking soon.`,
                        type: "alert",
                        priority: "high",
                        actionUrl: "/products"
                    });
                }
            }
        } catch (error) {
            console.error("RestockAgent checkAndNotify Error:", error);
        }
    },

    run: async () => {
        try {
            // Find products with low stock (threshold: 10)
            const lowStockProducts = await Product.find({ stockQty: { $lt: 10 } });

            for (const product of lowStockProducts) {
                await RestockAgent.checkAndNotify(product);
            }
        } catch (error) {
            console.error("RestockAgent run Error:", error);
        }
    }
};

module.exports = RestockAgent;
