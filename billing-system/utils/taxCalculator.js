const SELLER_STATE = "tamilnadu"; // Fixed Seller State

/**
 * Calculate GST based on Intra/Inter state logic.
 * @param {Array} items - Array of items with { rate, qty, gstRate }
 * @param {String} customerState - Customer's state
 * @returns {Object} Calculated totals and broken down tax
 */
function calculateGST(items, customerState) {
    const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");

    const isIntraState = normalize(customerState) === SELLER_STATE;

    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let processedItems = [];

    items.forEach(item => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        const gstRate = Number(item.gstRate) || 0;

        const amount = qty * rate;
        subtotal += amount;

        // Tax Calculation per item output
        // Note: Usually tax is calculated on the discounted taxable value, 
        // but for now we calculate base tax on item amount for display or logic
        // The final route logic might apply discount first. 
        // Let's stick to the route logic: Subtotal -> Discount -> Taxable -> Tax
        // So this helper might accept 'taxableAmount' instead of raw items if we want global discount.

        // HOWEVER, the user requirement says: "For EACH item, apply GST slab individually."
        // If we have a global discount, it technically reduces the taxable value of each item.
        // For simplicity and standard billing behavior (unless specified otherwise), 
        // we often calculate tax on the line item total, OR distribute discount.
        // Current logic in quotationRoutes.js applies a global discount percentage.
        // To be accurate, we should apply that discount percentage to each item to get its taxable value.

        processedItems.push({
            ...item,
            amount,
            gstRate
        });
    });

    return {
        isIntraState,
        subtotal,
        processedItems
    };
}

/**
 * Calculate Tax on Taxable Amount (Global Discount Approach)
 * Reference from previous route logic:
 * Subtotal -> Discount -> Taxable Amount -> GST Application
 */
function calculateFinal(subtotal, discountPercent, items, isIntraState) {
    const discountAmount = (subtotal * (discountPercent || 0)) / 100;
    const taxableAmount = subtotal - discountAmount;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    // We need to calculate tax based on the weighted average or per item proportion
    // To be precise per item as requested:
    // itemTaxable = item.amount - (item.amount * discountPercent / 100)

    items.forEach(item => {
        const itemAmount = item.amount;
        const itemTaxable = itemAmount - (itemAmount * (discountPercent || 0) / 100);
        const taxAmount = (itemTaxable * item.gstRate) / 100;

        if (isIntraState) {
            cgst += taxAmount / 2;
            sgst += taxAmount / 2;
        } else {
            igst += taxAmount;
        }
    });

    const totalGST = cgst + sgst + igst;
    const exactTotal = taxableAmount + totalGST;
    const roundedTotal = Math.round(exactTotal);
    const roundOff = roundedTotal - exactTotal;

    return {
        subtotal,
        discountAmount,
        taxableAmount,
        gstBreakup: {
            CGST: Number(cgst.toFixed(2)),
            SGST: Number(sgst.toFixed(2)),
            IGST: Number(igst.toFixed(2))
        },
        roundOff: Number(roundOff.toFixed(2)),
        total: Number(roundedTotal.toFixed(2))
    };
}

module.exports = { calculateGST, calculateFinal, SELLER_STATE };
