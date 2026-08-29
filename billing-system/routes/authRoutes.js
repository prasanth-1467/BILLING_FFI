console.log("AUTH ROUTES LOADED");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

router.post("/test", (req, res) => {
  res.json({ ok: true });
});

// REGISTER (run only once to create admin)
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();
    res.json({ message: "Admin user created" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "User disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY TOKEN / GET CURRENT USER
router.get("/me", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// UPDATE PROFILE
router.put("/update-profile", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    } catch (tokenErr) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    const { username, currentPassword, newPassword } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    // Update fields
    if (username) user.username = username;
    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    // Return updated user info
    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

// VERIFY ADMIN PASSWORD (for security verification before sensitive edits)
router.post("/verify-password", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password is required" });

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password. Access denied." });
    }

    res.json({ success: true, message: "Security verification successful" });
  } catch (err) {
    res.status(401).json({ error: "Authentication failed. Session expired or invalid." });
  }
});

// GET ALL USERS (Admin Only)
router.get("/users", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const caller = await User.findById(decoded.userId);
    if (!caller || caller.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    const users = await User.find({}, "-password").sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE NEW USER (Admin Only)
router.post("/users", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const caller = await User.findById(decoded.userId);
    if (!caller || caller.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({ error: `Username "${username}" already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: username.trim(),
      password: hashedPassword,
      role: role || "biller",
      isActive: true
    });

    await newUser.save();
    res.json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        isActive: newUser.isActive
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOGGLE USER STATUS (Admin Only)
router.patch("/users/:id/status", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const caller = await User.findById(decoded.userId);
    if (!caller || caller.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ message: `User ${user.username} is now ${user.isActive ? "Active" : "Disabled"}`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE USER (Admin Only)
router.delete("/users/:id", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const caller = await User.findById(decoded.userId);
    if (!caller || caller.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    if (decoded.userId === req.params.id) {
      return res.status(400).json({ error: "Cannot delete your own admin account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
