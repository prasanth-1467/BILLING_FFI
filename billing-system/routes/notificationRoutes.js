const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// Get all notifications
router.get("/", async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

// Mark all notifications as read
router.patch("/read-all", async (req, res) => {
    try {
        await Notification.updateMany({ read: false }, { read: true });
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update notifications" });
    }
});

// Mark a notification as read
router.patch("/:id/read", async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: "Failed to update notification" });
    }
});

// Delete a notification
router.delete("/:id", async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ message: "Notification deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete notification" });
    }
});

module.exports = router;
