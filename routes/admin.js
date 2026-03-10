import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";
import TicketInventory from "../models/TicketInventory.js";

const router = express.Router();

/* =========================================================
   🔐 AUTH MIDDLEWARE
========================================================= */

const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/* =========================================================
   📊 SALES ANALYTICS DASHBOARD
   GET /api/admin/analytics
========================================================= */

router.get(
  "/analytics",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {

      const range = req.query.range || "week";

      let groupFormat;

      if (range === "day") groupFormat = "%Y-%m-%d";
      if (range === "week") groupFormat = "%Y-%U";
      if (range === "month") groupFormat = "%Y-%m";

      const sales = await User.aggregate([
        { $unwind: "$tickets" },

        {
          $group: {
            _id: {
              $dateToString: {
                format: groupFormat,
                date: "$tickets.purchaseDate"
              }
            },
            revenue: { $sum: "$tickets.price" },
            ticketsSold: { $sum: 1 }
          }
        },

        { $sort: { _id: 1 } }
      ]);

      const totals = await User.aggregate([
        { $unwind: "$tickets" },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$tickets.price" },
            totalTickets: { $sum: 1 }
          }
        }
      ]);

      res.json({
        totals: totals[0] || { totalRevenue: 0, totalTickets: 0 },
        sales
      });

    } catch (err) {

      console.error("Analytics error:", err);
      res.status(500).json({ error: "Server error" });

    }
  }
);

/* =========================================================
   👑 PROMOTE USER TO ADMIN
   POST /api/admin/promote
========================================================= */

router.post(
  "/promote",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role === "admin") {
        return res.json({ success: true, message: "User already admin" });
      }

      user.role = "admin";
      await user.save();

      res.json({
        success: true,
        message: `${email} is now an admin`,
      });

    } catch (err) {

      console.error("Promote error:", err);
      res.status(500).json({ error: "Server error" });

    }
  }
);

/* =========================================================
   📊 GET INVENTORY
   GET /api/admin/inventory
========================================================= */

router.get(
  "/inventory",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {

      let inventory = await TicketInventory.find().sort({ tier: 1 });

      const tiers = ["early", "festival", "vip"];

      for (const tier of tiers) {

        const exists = inventory.find((i) => i.tier === tier);

        if (!exists) {

          const newTier = await TicketInventory.create({
            tier,
            total: 0,
            sold: 0,
          });

          inventory.push(newTier);

        }

      }

      res.json(inventory);

    } catch (err) {

      console.error("Inventory fetch error:", err);
      res.status(500).json({ error: "Server error" });

    }
  }
);

/* =========================================================
   🌐 PUBLIC INVENTORY
   GET /api/admin/inventory/public
========================================================= */

router.get("/inventory/public", async (req, res) => {
  try {

    let inventory = await TicketInventory.find().sort({ tier: 1 });

    const tiers = ["early", "festival", "vip"];

    for (const tier of tiers) {

      const exists = inventory.find((i) => i.tier === tier);

      if (!exists) {

        const newTier = await TicketInventory.create({
          tier,
          total: 0,
          sold: 0,
        });

        inventory.push(newTier);

      }

    }

    res.json(inventory);

  } catch (err) {

    console.error("Public inventory error:", err);
    res.status(500).json({ error: "Server error" });

  }
});

/* =========================================================
   ✏️ UPDATE INVENTORY TOTAL
   PUT /api/admin/inventory/:tier
========================================================= */

router.put(
  "/inventory/:tier",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {

      const { tier } = req.params;
      const { total } = req.body;

      if (typeof total !== "number" || total < 0) {
        return res.status(400).json({ error: "Invalid total value" });
      }

      let inventory = await TicketInventory.findOne({ tier });

      if (!inventory) {

        inventory = new TicketInventory({
          tier,
          total,
          sold: 0,
        });

      } else {

        if (total < inventory.sold) {
          return res.status(400).json({
            error: "Total cannot be less than sold tickets",
          });
        }

        inventory.total = total;

      }

      await inventory.save();

      res.json({
        success: true,
        inventory,
      });

    } catch (err) {

      console.error("Inventory update error:", err);
      res.status(500).json({ error: "Server error" });

    }
  }
);

/* =========================================================
   👥 GET ATTENDEES
   GET /api/admin/attendees
========================================================= */

router.get(
  "/attendees",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {

      const users = await User.find({
        tickets: { $exists: true, $not: { $size: 0 } },
      }).select("name email tickets");

      res.json(users);

    } catch (err) {

      console.error("Attendees fetch error:", err);
      res.status(500).json({ error: "Server error" });

    }
  }
);

/* =========================================================
   📷 QR CHECK-IN
   POST /api/admin/checkin
========================================================= */

router.post(
  "/checkin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {

      const { ticketId } = req.body;

      if (!ticketId) {
        return res.status(400).json({ error: "Ticket ID required" });
      }

      const user = await User.findOne({
        "tickets.ticketId": ticketId,
      });

      if (!user) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const ticket = user.tickets.find(
        (t) => t.ticketId === ticketId
      );

      if (ticket.checkedIn) {
        return res.status(400).json({
          error: "Ticket already checked in",
        });
      }

      ticket.checkedIn = true;
      await user.save();

      res.json({
        success: true,
        name: user.name,
        ticketId: ticket.ticketId,
        type: ticket.type,
      });

    } catch (err) {

      console.error("Check-in error:", err);
      res.status(500).json({ error: "Server error" });

    }
  }
);

export default router;
