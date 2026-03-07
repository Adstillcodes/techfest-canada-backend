import express from "express";
import Stripe from "stripe";
import User from "../models/User.js";
import TicketInventory from "../models/TicketInventory.js";
import crypto from "crypto";

import { generateTicketPDF } from "../services/pdfTicket.js";
import { sendTicketEmail } from "../services/emailService.js";
import { sendResetPasswordEmail } from "../services/emailService.js";
const router = express.Router();

// ⚠️ raw body required for Stripe
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ====================================================
    // ✅ PAYMENT SUCCESS
    // ====================================================
    if (event.type === "checkout.session.completed") {
      try {
        const session = event.data.object;

        const userId = session.metadata.userId;
        const tier = session.metadata.tier;

        if (!userId || !tier) {
          console.error("❌ Missing metadata:", session.metadata);
          return res.json({ received: true });
        }

        // ================= INVENTORY UPDATE =================
        const inventory = await TicketInventory.findOne({ tier });

        if (!inventory) {
          console.error("❌ Inventory not found for tier:", tier);
        } else {
          // 🛑 prevent oversell
          if (inventory.sold >= inventory.total) {
            console.error("❌ Attempted oversell for tier:", tier);
          } else {
            inventory.sold += 1;
            await inventory.save();
            console.log("📦 Inventory updated:", tier);
          }
        }

        // ================= CREATE TICKET =================
        const ticketId = crypto.randomBytes(6).toString("hex");

       const user = await User.findById(userId);

const ticket = {
  ticketId,
  type: tier,
  purchaseDate: new Date(),
  name: user.name
};

user.tickets.push(ticket);
await user.save();

const pdf = await generateTicketPDF(ticket);

await sendTicketEmail(user.email, user.name, pdf);
        console.log("✅ Ticket created for user:", userId);
      } catch (err) {
        console.error("❌ Webhook processing failed:", err);
      }
    }

    res.json({ received: true });
  }
);

export default router;