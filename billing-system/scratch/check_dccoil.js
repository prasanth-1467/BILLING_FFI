const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config();

async function checkDCCoil() {
    try {
        console.log("Connecting...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        const p = await Product.findOne({ name: /DC Coil/i });
        if (p) {
            console.log("Product Found:");
            console.log(`- Name: ${p.name}`);
            console.log(`  Code: ${p.productCode}`);
            console.log(`  HSN:  "${p.hsn}" (type: ${typeof p.hsn})`);
            console.log(`  GST:  ${p.gstRate}% (type: ${typeof p.gstRate})`);
            console.log(`  Unit: "${p.unit}"`);
        } else {
            console.log("Product not found matching /DC Coil/i");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

checkDCCoil();
