import express from "express";
import Subscription from "../models/Subscription.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = express.Router();

router.post("/subscribe", async (req, res) => {
  try {
    const { email, source = "website" } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existing = await Subscription.findOne({ email: email.toLowerCase() });

    if (existing) {
      if (existing.subscribed) {
        return res.json({ message: "Already subscribed" });
      }
      existing.subscribed = true;
      await existing.save();
      return res.json({ message: "Resubscribed successfully" });
    }

    const subscription = await Subscription.create({
      email: email.toLowerCase(),
      source,
    });

    res.status(201).json({ message: "Subscribed successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ message: "Already subscribed" });
    }
    console.error("Subscription error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/unsubscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const subscription = await Subscription.findOne({ email: email.toLowerCase() });

    if (!subscription) {
      return res.json({ message: "Not found or already unsubscribed" });
    }

    subscription.subscribed = false;
    await subscription.save();

    res.json({ message: "Unsubscribed successfully" });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, subscribed } = req.query;

    const query = {};
    if (subscribed !== undefined) {
      query.subscribed = subscribed === "true";
    }

    const subscriptions = await Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin subscriptions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const total = await Subscription.countDocuments();
    const active = await Subscription.countDocuments({ subscribed: true });
    const inactive = total - active;

    res.json({ total, active, inactive });
  } catch (err) {
    console.error("Subscription stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
