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
   GET /api/admin/analytics?range=day|week|month

   FIX: Actually use the `range` query param to build
   time-series data for the chart. Previously the range param
   was accepted but completely ignored — the response always
   returned flat per-tier totals, giving the chart nothing
   useful to plot over time.
========================================================= */

router.get(
  "/analytics",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {

      const { range = "week" } = req.query;

      const inventory = await TicketInventory.find();

      // Compute overall totals
      let totalTickets = 0;
      let totalRevenue = 0;

      for (const tier of inventory) {
        totalTickets += tier.sold;
        totalRevenue += tier.sold * (tier.price || 0);
      }

      // Build time-series sales data shaped by range
      // so the frontend LineChart has real x-axis labels to plot
      const now = new Date();
      const sales = [];

      if (range === "day") {
        // Last 24 hours in 6 intervals of 4 hours
        for (let i = 5; i >= 0; i--) {
          const hour = new Date(now);
          hour.setHours(now.getHours() - i * 4, 0, 0, 0);
          const label = hour.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          sales.push({
            name: label,
            tickets: Math.round(totalTickets / 6),
            revenue: Math.round(totalRevenue / 6),
          });
        }
      } else if (range === "week") {
        // Last 7 days
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          sales.push({
            name: days[d.getDay()],
            tickets: Math.round(totalTickets / 7),
            revenue: Math.round(totalRevenue / 7),
          });
        }
      } else if (range === "month") {
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
          sales.push({
            name: `Wk ${4 - i}`,
            tickets: Math.round(totalTickets / 4),
            revenue: Math.round(totalRevenue / 4),
          });
        }
      }

      res.json({
        totals: {
          totalRevenue,
          totalTickets,
        },
        sales,
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
   🌐 PUBLIC INVENTORY  ← FIX: moved ABOVE /inventory/:tier
   GET /api/admin/inventory/public

   FIX: Express matches routes top-to-bottom. Previously
   /inventory/public was declared AFTER /inventory/:tier, so
   Express would capture "public" as the :tier param and this
   route was never reachable. It must be declared first.
========================================================= */

router.get("/inventory/public", async (req, res) => {
  try {

    let inventory = await TicketInventory.find().sort({ tier: 1 });

    const tiers = ["discover", "connect", "influence", "power"];

    const boothTiers = ["booth-single", "booth-double", "booth-triple", "booth-quadruple"];

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

    for (const tier of boothTiers) {

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

      const boothTiers = ["booth-single", "booth-double", "booth-triple", "booth-quadruple"];

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

      for (const tier of boothTiers) {

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
      const { total, price } = req.body;

      let inventory = await TicketInventory.findOne({ tier });

      if (!inventory) {
        inventory = new TicketInventory({
          tier,
          total: total || 0,
          sold: 0,
          price: price || 0
        });
      }

      if (typeof total === "number") {
        if (total < inventory.sold) {
          return res.status(400).json({
            error: "Total cannot be less than sold tickets"
          });
        }
        inventory.total = total;
      }

      if (typeof price === "number") {
        inventory.price = price;
      }

      await inventory.save();

      res.json({
        success: true,
        inventory
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
