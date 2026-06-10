const express = require("express");
const router = express.Router();
const BusinessSettings = require("../models/BusinessSettings");

// GET /api/settings
router.get("/", async (req, res) => {
  try {
    let settings = await BusinessSettings.findOne();
    if (!settings) {
      settings = new BusinessSettings();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings
router.patch("/", async (req, res) => {
  try {
    const { defaultTheme } = req.body;
    let settings = await BusinessSettings.findOne();
    if (!settings) {
      settings = new BusinessSettings();
    }
    if (defaultTheme) {
      settings.defaultTheme = defaultTheme;
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
