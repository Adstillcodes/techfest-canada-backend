import express from "express";
import User from "../models/User.js";

const router = express.Router();

// ================= CHECK-IN =================
router.post("/scan", async (req, res) => {
  try {
    const { ticketId } = req.body;

    if (!ticketId) {
      return res.status(400).json({
        error: "Ticket ID required",
      });
    }

    // 🔍 find ticket
    const user = await User.findOne({
      "tickets.ticketId": ticketId,
    });

    if (!user) {
      return res.status(404).json({
        status: "invalid",
        message: "Ticket not found",
      });
    }

    const ticket = user.tickets.find(
      (t) => t.ticketId === ticketId
    );

    // 🚫 already used
    if (ticket.checkedIn) {
      return res.json({
        status: "already_checked_in",
        name: user.name,
        time: ticket.checkedInAt,
      });
    }

    // ✅ mark as checked in
    ticket.checkedIn = true;
    ticket.checkedInAt = new Date();
    await user.save();

    res.json({
      status: "success",
      name: user.name,
      ticketType: ticket.type,
    });
  } catch (err) {
    console.error("CHECK-IN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;