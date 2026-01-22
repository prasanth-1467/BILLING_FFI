const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log("No users found. Creating default admin...");
            const hashedPassword = await bcrypt.hash("password", 10);
            const admin = new User({
                username: "admin",
                password: hashedPassword,
                role: "admin",
                isActive: true
            });
            await admin.save();
            console.log("Default admin created: admin / password");
        } else {
            console.log("Users already exist. Skipping seed.");
        }
        process.exit();
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedAdmin();
