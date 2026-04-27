const mongoose = require("mongoose");
require("dotenv").config();

async function checkDB() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully.");

        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log("\nSearching across all databases:");

        for (let d of dbs.databases) {
            if (["admin", "local", "config"].includes(d.name)) continue;
            
            console.log(`\n--- Database: ${d.name} ---`);
            const targetDb = mongoose.connection.useDb(d.name).db;
            const collections = await targetDb.listCollections().toArray();
            
            if (collections.length === 0) {
                console.log("No collections found.");
            } else {
                for (let col of collections) {
                    const count = await targetDb.collection(col.name).countDocuments();
                    console.log(`- ${col.name}: ${count} documents`);
                }
            }
        }

        await mongoose.disconnect();
        console.log("\nDisconnected.");
    } catch (err) {
        console.error("Connection Error:", err);
    }
}

checkDB();
