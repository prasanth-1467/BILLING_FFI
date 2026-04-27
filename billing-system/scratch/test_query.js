const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config();

async function testQuery() {
    try {
        console.log("Connecting...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        const count = await Product.countDocuments();
        console.log(`Total Products: ${count}`);

        const products = await Product.find().limit(5);
        console.log("Sample Products:", products.map(p => p.name));

        await mongoose.disconnect();
    } catch (err) {
        console.error("Query Error:", err);
    }
}

testQuery();
